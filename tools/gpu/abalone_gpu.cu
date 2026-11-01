/* Abalassembly -- le moteur de jeu pour la carte graphique (CUDA), et pour le processeur.

   Une seule source :
   - compilee par NVRTC (CuPy) dans le carnet Colab (tools/gpu/Abalassembly_GPU.ipynb) :
     le noyau « parties » joue des milliers de parties en meme temps ;
   - compilee par g++ pour les tests (tools/gpu/test_cpu.cpp), qui la comparent au
     moteur du site coup par coup (tools/gpu/verifier.js).

   Ce sont les regles, l'evaluation et la recherche du moteur du site (AI_WORKER_CODE,
   src/main/13-move-detection-motifs.js), recopiees a l'identique :
   - les coups : getAllMovesForColor / validateMove / abApplyMove ;
   - l'evaluation : evaluateBoard avec les poids par defaut (EVAL_W) ;
   - la recherche : searchBestMove a profondeur fixe -- alpha-beta, puis a la feuille la
     quiescence sur les ejections (4 demi-coups), comme search / quiescence ;
   - les penalites de repetition et d'aller-retour (v2.60) des duels du Labo ;
   - l'arbitrage de playDuelGame : 6 ejections, 3 d'avance (adj3), puis a la fin
     l'avance en billes, sinon l'evaluation (au-dela de 400), sinon nulle.
   Pas de table de transposition : elle ne change pas la note d'un coup a la racine
   (chaque coup y est cherche avec une fenetre complete). Pas de table de finale :
   elle ne sert qu'a 4 billes ou moins, jamais avant la fin d'une partie a 14 billes.

   Plateau : 61 cases, numerotees ligne par ligne comme (r,c) dans le site (r=0 en haut,
   ligne a de la notation = r=8). 0 vide, 1 noir, 2 blanc. Directions dans l'ordre de
   AX_DIRS : (1,0) (-1,0) (0,-1) (1,-1) (0,1) (-1,1) en coordonnees axiales (q,r). */

#if defined(__CUDACC__) || defined(__CUDACC_RTC__)
#define AB_GPU 1
#define HD __device__ __forceinline__
#define HDN __device__ __noinline__
#else
#define HD inline
#define HDN inline
#endif

typedef unsigned long long u64;
typedef unsigned int u32;

#define NOIR 1
#define BLANC 2
#define NCASES 61
#define MAXC 160          // coups d'une position : 98 au plus sur 3 000 positions (verifier.js) ; au-dela, le garde-fou le signale
#define MAXQ 48           // coups qui ejectent
#define AB_INF 1000000000

/* poids de l'evaluation : EVAL_W par defaut du site */
#define W_CENTER 6
#define W_COHESION 4
#define W_EDGE 8
#define W_MOB 2
#define W_ISO 18
#define W_DNG 14
#define W_CHAIN 10
#define W_FORT 20

struct Tab {                 // la geometrie du plateau
  signed char nb[NCASES][6]; // voisin dans chaque direction, -1 hors du plateau
  unsigned char dist[NCASES];// distance au centre e5
};

HD int abAbs(int x) { return x < 0 ? -x : x; }

HD void tabCase(Tab& t, int i) {
  const int ROWS[9] = {5, 6, 7, 8, 9, 8, 7, 6, 5};
  const int DEB[9] = {0, 5, 11, 18, 26, 35, 43, 50, 56};
  const int DQ[6] = {1, -1, 0, 1, 0, -1}, DR[6] = {0, 0, -1, -1, 1, 1};
  int r = 0; while (r < 8 && i >= DEB[r + 1]) r++;
  int c = i - DEB[r];
  int q = r <= 4 ? c - r : c - 4, a = r - 4;            // rcToAxial
  for (int d = 0; d < 6; d++) {
    int q2 = q + DQ[d], a2 = a + DR[d], row = a2 + 4, v = -1;   // axialToRc
    if (row >= 0 && row <= 8) { int col = row <= 4 ? q2 + row : q2 + 4; if (col >= 0 && col < ROWS[row]) v = DEB[row] + col; }
    t.nb[i][d] = (signed char)v;
  }
  t.dist[i] = (unsigned char)((abAbs(q) + abAbs(q + a) + abAbs(a)) / 2);
}

struct Etat { unsigned char b[NCASES]; unsigned char cb, cw; };   // cb : billes blanches ejectees par les Noirs

/* un coup : n billes a partir de a, alignees selon l'axe f (n > 1), poussees dans la direction dir.
   type 0 : en ligne vers une case vide ; 1 : poussee (eject : la derniere bille adverse sort) ;
   2 : de cote. Pour 0 et 1, seules la queue (tail) et la case de devant (front) changent ;
   dest : la case ou va la derniere bille poussee (si elle ne sort pas). */
struct Coup { unsigned char a, n, f, dir, type, eject, front, tail, dest, pad[3]; };

HD int oppDir(int d) { const int O[6] = {1, 0, 4, 5, 2, 3}; return O[d]; }

HD void ajoute(Coup* L, int& n, int maxc, int& debord, int a, int k, int f, int d, int type, int ej, int fr, int tl, int dst) {
  if (n >= maxc) { debord = 1; return; }
  Coup& m = L[n++];
  m.a = (unsigned char)a; m.n = (unsigned char)k; m.f = (unsigned char)f; m.dir = (unsigned char)d; m.type = (unsigned char)type;
  m.eject = (unsigned char)ej; m.front = (unsigned char)fr; m.tail = (unsigned char)tl; m.dest = (unsigned char)(dst < 0 ? 255 : dst);
}

/* tous les coups de « me » (ejecte : seulement ceux qui ejectent), ejections d'abord, puis
   poussees, puis le reste (l'ordre ne change pas les notes, seulement la vitesse). */
HDN int genCoups(const Etat& e, const Tab& t, int me, Coup* L, int maxc, bool ejecte, int& debord) {
  const int AXES[3] = {0, 2, 3};
  int n = 0, op = 3 - me;
  for (int p = 0; p < NCASES; p++) {
    if (e.b[p] != me) continue;
    if (!ejecte) for (int d = 0; d < 6; d++) { int fr = t.nb[p][d]; if (fr >= 0 && e.b[fr] == 0) ajoute(L, n, maxc, debord, p, 1, 0, d, 0, 0, fr, p, -1); }
    for (int ai = 0; ai < 3; ai++) {
      int f = AXES[ai], p2 = t.nb[p][f];
      if (p2 < 0 || e.b[p2] != me) continue;
      int p3 = t.nb[p2][f];
      for (int k = 2; k <= 3; k++) {
        if (k == 3 && (p3 < 0 || e.b[p3] != me)) break;
        int last = k == 3 ? p3 : p2;
        for (int d = 0; d < 6; d++) {
          if (d == f || d == oppDir(f)) {               // en ligne
            int head = d == f ? last : p, tail = d == f ? p : last;
            int fr = t.nb[head][d]; if (fr < 0) continue;
            int v = e.b[fr];
            if (v == 0) { if (!ejecte) ajoute(L, n, maxc, debord, p, k, f, d, 0, 0, fr, tail, -1); continue; }
            if (v == me) continue;
            int cnt = 0, cur = fr;
            while (cur >= 0 && e.b[cur] == op) { cnt++; cur = t.nb[cur][d]; }
            if (cnt >= k) continue;
            if (cur >= 0) { if (e.b[cur] != 0) continue; if (!ejecte) ajoute(L, n, maxc, debord, p, k, f, d, 1, 0, fr, tail, cur); }
            else ajoute(L, n, maxc, debord, p, k, f, d, 1, 1, fr, tail, -1);
          } else if (!ejecte) {                          // de cote
            int c0 = p, c1 = p2, c2 = k == 3 ? p3 : -1, ok = 1;
            int t0 = t.nb[c0][d], t1 = t.nb[c1][d];
            if (t0 < 0 || e.b[t0] || t1 < 0 || e.b[t1]) ok = 0;
            if (ok && c2 >= 0) { int t2 = t.nb[c2][d]; if (t2 < 0 || e.b[t2]) ok = 0; }
            if (ok) ajoute(L, n, maxc, debord, p, k, f, d, 2, 0, 0, 0, -1);
          }
        }
      }
    }
  }
  // ejections d'abord, puis les autres poussees
  int w = 0;
  for (int i = 0; i < n; i++) if (L[i].eject) { Coup x = L[w]; L[w] = L[i]; L[i] = x; w++; }
  for (int i = w; i < n; i++) if (L[i].type == 1) { Coup x = L[w]; L[w] = L[i]; L[i] = x; w++; }
  return n;
}

HD void appliquer(Etat& e, const Coup& m, int me, const Tab& t) {
  if (m.type == 2) {
    int c[3]; c[0] = m.a; c[1] = t.nb[c[0]][m.f]; c[2] = m.n == 3 ? t.nb[c[1]][m.f] : -1;
    for (int i = 0; i < m.n; i++) e.b[c[i]] = 0;
    for (int i = 0; i < m.n; i++) e.b[t.nb[c[i]][m.dir]] = (unsigned char)me;
    return;
  }
  if (m.type == 1) {
    if (m.eject) { if (me == NOIR) e.cb++; else e.cw++; }
    else e.b[m.dest] = (unsigned char)(3 - me);
  }
  e.b[m.tail] = 0; e.b[m.front] = (unsigned char)me;
}

/* evaluateBoard(color), a l'identique */
HDN int evaluer(const Etat& e, const Tab& t, int color) {
  const int AXF[3] = {0, 2, 3}, AXB[3] = {1, 4, 5};     // EVAL_AXES
  int cnt[3] = {0, 0, 0}, cen[3] = {0, 0, 0}, coh[3] = {0, 0, 0}, edg[3] = {0, 0, 0}, mob[3] = {0, 0, 0};
  int iso[3] = {0, 0, 0}, dng[3] = {0, 0, 0}, chn[3] = {0, 0, 0}, frt[3] = {0, 0, 0};
  for (int i = 0; i < NCASES; i++) {
    int v = e.b[i]; if (!v) continue;
    int dist = t.dist[i], isEdge = dist >= 4, allies = 0, vides = 0;
    for (int d = 0; d < 6; d++) { int x = t.nb[i][d]; if (x < 0) continue; int w = e.b[x]; if (w == v) allies++; else if (!w) vides++; }
    int links = 0;
    for (int a = 0; a < 3; a++) {
      int bn = t.nb[i][AXB[a]]; if (bn >= 0 && e.b[bn] == v) continue;
      int len = 1, cur = t.nb[i][AXF[a]];
      while (cur >= 0 && e.b[cur] == v) { len++; cur = t.nb[cur][AXF[a]]; }
      if (len >= 2) links += len - 1;
    }
    cnt[v]++; cen[v] += 4 - dist; coh[v] += allies; if (isEdge) edg[v]++; mob[v] += vides;
    if (allies == 0) iso[v]++;
    if (isEdge && allies <= 1) dng[v]++;
    if (allies >= 4) frt[v]++;
    chn[v] += links;
  }
  int m = color, o = 3 - color;
  int cap = color == BLANC ? (int)e.cw - (int)e.cb : (int)e.cb - (int)e.cw;
  return (cnt[m] - cnt[o]) * 1000 + (cen[m] - cen[o]) * W_CENTER + (coh[m] - coh[o]) * W_COHESION + (edg[o] - edg[m]) * W_EDGE
    + cap * 1000 + (mob[m] - mob[o]) * W_MOB + (iso[o] - iso[m]) * W_ISO + (dng[o] - dng[m]) * W_DNG
    + (chn[m] - chn[o]) * W_CHAIN + (frt[m] - frt[o]) * W_FORT;
}

/* quiescence(alpha, beta, pov, maxi, qd) */
template <int QD> HD int qs(const Etat& e, int alpha, int beta, int pov, bool maxi, const Tab& t, int& debord) {
  if (e.cw >= 6) return pov == BLANC ? 100000 : -100000;
  if (e.cb >= 6) return pov == NOIR ? 100000 : -100000;
  int sp = evaluer(e, t, pov);
  if constexpr (QD <= 0) { return sp; }
  else {
    if (maxi) { if (sp >= beta) return beta; if (sp > alpha) alpha = sp; }
    else { if (sp <= alpha) return alpha; if (sp < beta) beta = sp; }
    int mc = maxi ? pov : 3 - pov;
    Coup L[MAXQ]; int n = genCoups(e, t, mc, L, MAXQ, true, debord);
    for (int i = 0; i < n; i++) {
      Etat c = e; appliquer(c, L[i], mc, t);
      int s = qs<QD - 1>(c, alpha, beta, pov, !maxi, t, debord);
      if (maxi) { if (s > alpha) alpha = s; if (alpha >= beta) break; }
      else { if (s < beta) beta = s; if (beta <= alpha) break; }
    }
    return maxi ? alpha : beta;
  }
}

/* search(depth, alpha, beta, maxi, pov) */
template <int D> HD int chercher(const Etat& e, int alpha, int beta, bool maxi, int pov, const Tab& t, int& debord) {
  if (e.cw >= 6) return pov == BLANC ? 100000 : -100000;
  if (e.cb >= 6) return pov == NOIR ? 100000 : -100000;
  if constexpr (D <= 0) { return qs<4>(e, alpha, beta, pov, maxi, t, debord); }
  else {
    int mc = maxi ? pov : 3 - pov;
    Coup L[MAXC]; int n = genCoups(e, t, mc, L, MAXC, false, debord);
    if (!n) return maxi ? -99999 : 99999;
    int best = maxi ? -AB_INF : AB_INF;
    for (int i = 0; i < n; i++) {
      Etat c = e; appliquer(c, L[i], mc, t);
      int s = chercher<D - 1>(c, alpha, beta, !maxi, pov, t, debord);
      if (maxi) { if (s > best) best = s; if (best > alpha) alpha = best; }
      else { if (s < best) best = s; if (best < beta) beta = best; }
      if (alpha >= beta) break;
    }
    return best;
  }
}

/* hachage des billes d'un camp (cle de repetition) */
HD u64 abMix(u64 x) { x += 0x9E3779B97F4A7C15ULL; x = (x ^ (x >> 30)) * 0xBF58476D1CE4E5B9ULL; x = (x ^ (x >> 27)) * 0x94D049BB133111EBULL; return x ^ (x >> 31); }
HD u64 hachCamp(const Etat& e, int col) { u64 h = 0; for (int i = 0; i < NCASES; i++) if (e.b[i] == col) h ^= abMix((u64)(i * 2 + col)); return h; }

/* l'historique des positions de la partie (60 dernieres, comme hist.slice(-60)) : billes noires, billes blanches */
struct Hist { u64 hb[60], hw[60]; int n; };
HD void histAjoute(Hist& h, const Etat& e) { int i = h.n % 60; h.hb[i] = hachCamp(e, NOIR); h.hw[i] = hachCamp(e, BLANC); h.n++; }
HD u64 empreinte(u64 emp, const Hist& h) { int i = (h.n - 1) % 60; return abMix(emp ^ h.hb[i] ^ (h.hw[i] << 1 | h.hw[i] >> 63)); }
HD int histTaille(const Hist& h) { return h.n < 60 ? h.n : 60; }
HD int histIdx(const Hist& h, int j) { return (h.n - 1 - j) % 60; }        // j-ieme position en partant de la derniere

HD u32 abAlea(u64& s) { s ^= s >> 12; s ^= s << 25; s ^= s >> 27; return (u32)((s * 0x2545F4914F6CDD1DULL) >> 32); }

/* searchBestMove(pov, prof) : la note de chaque coup, penalites comprises (penal) ; puis un coup tire au
   hasard parmi ceux a moins de « marge » points du meilleur. exact : fenetre complete pour chaque coup
   (les tests) ; sinon les coups hors de la marge ne sont que bornes. Rend l'indice du coup, -1 sans coup. */
HD int racine(const Etat& e, int pov, int prof, int marge, const Hist* h, const Tab& t, u64& rng, Coup* L, int* sc,
              int& nOut, int& meilleur, bool exact, int& debord) {
  int n = genCoups(e, t, pov, L, MAXC, false, debord); nOut = n; meilleur = -AB_INF;
  if (!n) return -1;
  // penalites (searchBestMove : repCount et _allerRetourRef)
  int nh = h ? histTaille(*h) : 0, arN = 0; u64 arCle = 0; bool ar = false;
  if (h && nh >= 3) {
    u64 D[8]; int nd = 0;
    for (int j = 0; j < nh && nd < 8; j += 2) { int x = histIdx(*h, j); D[nd++] = pov == NOIR ? h->hb[x] : h->hw[x]; }
    int k2 = 1; for (int k = 0; k + 2 < nd && D[k] == D[k + 2] && k2 < 3; k++) k2++;
    ar = true; arN = k2; arCle = D[1];
  }
  for (int i = 0; i < n; i++) {
    Etat c = e; appliquer(c, L[i], pov, t);
    int alphaR = (exact || meilleur == -AB_INF) ? -AB_INF : meilleur - marge - 1, s;
    if (prof <= 1) s = chercher<0>(c, alphaR, AB_INF, false, pov, t, debord);
    else if (prof == 2) s = chercher<1>(c, alphaR, AB_INF, false, pov, t, debord);
    else s = chercher<2>(c, alphaR, AB_INF, false, pov, t, debord);
    if (!exact && alphaR > -AB_INF && s <= alphaR) { sc[i] = -AB_INF; continue; }   // hors de la marge
    if (nh) {
      u64 hb = hachCamp(c, NOIR), hw = hachCamp(c, BLANC), cle = hb ^ hw; int rc = 0;
      for (int j = 0; j < nh; j++) { int x = histIdx(*h, j); if ((h->hb[x] ^ h->hw[x]) == cle) rc++; }
      if (rc) s -= 140 * rc * rc;
      if (ar && (pov == NOIR ? hb : hw) == arCle) s -= 140 * arN * arN;
    }
    sc[i] = s; if (s > meilleur) meilleur = s;
  }
  int nc = 0; for (int i = 0; i < n; i++) if (sc[i] >= meilleur - marge) nc++;
  int k = (int)(((u64)abAlea(rng) * (u64)nc) >> 32);
  for (int i = 0; i < n; i++) if (sc[i] >= meilleur - marge) { if (!k) return i; k--; }
  return 0;
}

struct Params { int prof, marge, ouverture, maxp, adj3, penal; };
struct Res { int gagnant, why, plies, premiere, cb, cw; u64 emp; };   // gagnant 0 nulle, 1 Noirs, 2 Blancs ; emp : empreinte de la partie
/* why : 1 six ejections ; 2 trois d'avance ; 3 avance en billes a la fin ; 4 evaluation a la fin ; 5 nulle ; 6 plus de coup */

/* une partie, comme playDuelGame : les Noirs commencent ; « ouverture » demi-coups tires au hasard
   (sans ejection), puis maxp demi-coups au plus du moteur contre lui-meme. */
HD void jouer(const unsigned char* dep, const Params& P, u64 graine, const Tab& t, Res& R, Coup* L, int* sc, Hist& h, int& debord) {
  Etat e; for (int i = 0; i < NCASES; i++) e.b[i] = dep[i]; e.cb = 0; e.cw = 0;
  u64 rng = abMix(graine) | 1ULL; h.n = 0;
  int col = NOIR, plies = 0; R.premiere = 0; R.emp = 0;
  for (int i = 0; i < P.ouverture; i++) {
    int n = genCoups(e, t, col, L, MAXC, false, debord), nq = 0;
    for (int j = 0; j < n; j++) if (!L[j].eject) nq++;
    if (!nq) break;
    int k = (int)(((u64)abAlea(rng) * (u64)nq) >> 32), j = 0;
    for (; j < n; j++) if (!L[j].eject) { if (!k) break; k--; }
    appliquer(e, L[j], col, t); histAjoute(h, e); R.emp = empreinte(R.emp, h); col = 3 - col; plies++;
  }
  for (int i = 0; i < P.maxp; i++) {
    int n, best;
    int idx = racine(e, col, P.prof, P.marge, P.penal ? &h : 0, t, rng, L, sc, n, best, false, debord);
    if (idx < 0) { R.gagnant = 3 - col; R.why = 6; R.plies = plies; R.cb = e.cb; R.cw = e.cw; return; }
    appliquer(e, L[idx], col, t); histAjoute(h, e); R.emp = empreinte(R.emp, h); plies++;
    if (!R.premiere && e.cb + e.cw > 0) R.premiere = plies;
    if (e.cb >= 6 || e.cw >= 6) { R.gagnant = e.cb >= 6 ? NOIR : BLANC; R.why = 1; R.plies = plies; R.cb = e.cb; R.cw = e.cw; return; }
    int d = (int)e.cb - (int)e.cw;
    if (P.adj3 && (d >= 3 || d <= -3)) { R.gagnant = d > 0 ? NOIR : BLANC; R.why = 2; R.plies = plies; R.cb = e.cb; R.cw = e.cw; return; }
    col = 3 - col;
  }
  R.plies = plies; R.cb = e.cb; R.cw = e.cw;
  int d2 = (int)e.cb - (int)e.cw;
  if (d2) { R.gagnant = d2 > 0 ? NOIR : BLANC; R.why = 3; return; }
  int ev = evaluer(e, t, NOIR);
  if (ev > 400) { R.gagnant = NOIR; R.why = 4; } else if (ev < -400) { R.gagnant = BLANC; R.why = 4; } else { R.gagnant = 0; R.why = 5; }
}

#ifdef AB_GPU
/* chaque fil prend la partie suivante dans la file (compteur) jusqu'a la fin : les parties
   longues et courtes se partagent les fils sans attente. sortie : 8 entiers par partie (gagnant, pourquoi,
   demi-coups, demi-coup de la premiere ejection ou 0, billes ejectees par les Noirs, par les Blancs,
   debordement de liste, empreinte de la partie). */
extern "C" __global__ void parties(const unsigned char* departs, int nTaches, const int* tDep, const int* tNum,
                                   int prof, int marge, int ouverture, int maxp, int adj3, int penal,
                                   unsigned long long graine, int* compteur, int* sortie) {
  __shared__ Tab t;
  for (int i = threadIdx.x; i < NCASES; i += blockDim.x) tabCase(t, i);
  __syncthreads();
  Params P; P.prof = prof; P.marge = marge; P.ouverture = ouverture; P.maxp = maxp; P.adj3 = adj3; P.penal = penal;
  Coup L[MAXC]; int sc[MAXC]; Hist h;
  while (true) {
    int g = atomicAdd(compteur, 1);
    if (g >= nTaches) break;
    Res R; int debord = 0;
    jouer(departs + NCASES * tDep[g], P, graine ^ ((u64)tDep[g] << 32) ^ (u64)(unsigned)tNum[g], t, R, L, sc, h, debord);
    int* o = sortie + 8 * g;
    o[0] = R.gagnant; o[1] = R.why; o[2] = R.plies; o[3] = R.premiere; o[4] = R.cb; o[5] = R.cw; o[6] = debord; o[7] = (int)(R.emp & 0x7fffffffULL);
  }
}
#endif

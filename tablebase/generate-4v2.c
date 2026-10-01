/* generate-4v2.c -- table de finale 4 contre 2 du mode Decouverte (7 billes par
   camp ; un camp perd quand il tombe a 1 bille). Resultats : RESULTS.md.

   Donnees de reference, reprises a l'identique (jamais recalculees ici) :
   ref.bin, ecrit par export-ref-4v2.js depuis le code deja valide du 3v3 et la
   table 3v2 embarquee dans le jeu : geometrie, 12 symetries, canonisation des
   paires, table 3v2 (coups ou le camp faible ejecte une bille forte).

   Generateur de coups : logique de succ() de generate-3v3.js, generalisee a 4
   billes. Compare au VRAI moteur du jeu (verify-4v2-engine.js) : 10 000
   positions, dont 5 263 ejections, zero difference.

   Methode :
   - niveaux 1 a 9 : balayage complet (la table 3v2, profonde de 7, peut encore
     y declencher des resolutions) ;
   - niveau 10 et au-dela : REMONTEE. Une position ne change de statut au
     niveau d que si l'une de ses suites vient d'etre resolue en d-1 : on
     genere un SUR-ensemble de ses predecesseurs, juges un a un par
     l'evaluateur exact. Validee contre le balayage complet : niveaux 1 a 32
     identiques au decompte pres.
   - piege corrige : quand les 4 billes fortes forment une figure elle-meme
     symetrique, une MEME position occupe plusieurs cases (plusieurs
     symetries menent au representant canonique). La remontee les marque
     TOUTES ; n'en marquer qu'une oubliait des positions (niveau 10 : 28 109
     pertes au lieu de 28 110).
   - parite : un gain finit par un coup du gagnant (profondeur impaire), une
     perte par un coup adverse (paire). Verifie sur la table 3v2 au
     demarrage, et a chaque resolution.
   - profondeur (DTW) d'un gain par ejection vers une position 3v2 perdue par
     l'adversaire : profondeur de cette position PLUS UN (le solveur 3v3,
     lui, la comptait 1 -- classement juste, profondeur sous-estimee).

   Preuve : mode verifyall -- CHAQUE position recontrolee contre les equations
   exactes (gain : profondeur minimale parmi ses coups ; perte : tous les
   coups vers un gain adverse, le plus long valant d-1 ; nulle : aucun coup
   gagnant, pas tous perdants). 140 575 680 positions, zero incoherence.

   Utilisation (depuis tablebase/) :
     node export-ref-4v2.js                 # ecrit ref.bin et les jeux de controle
     gcc -O2 -march=native -o tb42 generate-4v2.c
     ./tb42 lookup < lookup_nonnul.txt      # consultation 3v2 identique au JS
     node verify-4v2-engine.js              # generateur = moteur du jeu
     ./tb42 solve 280                       # a relancer jusqu'a "TERMINE"
     for k in $(seq 0 15); do ./tb42 verifyall $k 16; done
     ./tb42 stats
     ./tb42 pv 0 4 26 60 47 54 > pv.txt && node replay-4v2-pv.js
     mkdir -p shards && ./tb42 shards && python3 pack-4v2.py   # morceaux du jeu -> 4v2/
     ./tb42 perdant        # une position ou un coup laisse echapper le gain (test du Trainer)
   Environ 20 minutes sur un seul coeur ; 3 Go de memoire suffisent. */
#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <string.h>
#include <time.h>
#define N 61
#define NP 1830
#define NT3 35990
#define K2 180
#define NQ 521855

static int8_t NBI[N * 6];
static int8_t SYM[12][N];
static int16_t canonRep2[NP];
static int8_t canonG2[NP];
static uint8_t *st32, *dt32;
static int32_t PIDX[N * N];
static int PA[NP][2];
static int32_t *TIDX, *QIDX;
static uint8_t QC[NQ][4];
static int32_t repRank[NQ];
static int8_t canonG4[NQ];
static int32_t *REPQ;
static int K4 = 0;
static uint8_t *st, *dt;
static size_t TOTAL;

static inline int pid(int a, int b) { return a < b ? PIDX[a * N + b] : PIDX[b * N + a]; }
static inline int tid3(int a, int b, int c) {
  int t;
  if (a > b) { t = a; a = b; b = t; }
  if (b > c) { t = b; b = c; c = t; }
  if (a > b) { t = a; a = b; b = t; }
  return TIDX[(a * N + b) * N + c];
}
static inline int qid4(int a, int b, int c, int d) {
  int v[4] = {a, b, c, d};
  for (int i = 1; i < 4; i++) { int x = v[i], j = i - 1; while (j >= 0 && v[j] > x) { v[j + 1] = v[j]; j--; } v[j + 1] = x; }
  return QIDX[((v[0] * N + v[1]) * N + v[2]) * N + v[3]];
}

static void charger_ref(void) {
  FILE *f = fopen("ref.bin", "rb");
  if (!f) { fprintf(stderr, "ref.bin absent\n"); exit(1); }
  size_t T32 = (size_t)K2 * NT3 * 2;
  st32 = malloc(T32); dt32 = malloc(T32);
  if (fread(NBI, 1, N * 6, f) != N * 6 || fread(SYM, 1, 12 * N, f) != 12 * N ||
      fread(canonRep2, 2, NP, f) != NP || fread(canonG2, 1, NP, f) != NP ||
      fread(st32, 1, T32, f) != T32 || fread(dt32, 1, T32, f) != T32) { fprintf(stderr, "ref.bin tronque\n"); exit(1); }
  fclose(f);
  int n = 0;
  for (int i = 0; i < N; i++) for (int j = i + 1; j < N; j++) { PIDX[i * N + j] = n; PA[n][0] = i; PA[n][1] = j; n++; }
  TIDX = malloc(sizeof(int32_t) * N * N * N); n = 0;
  for (int i = 0; i < N; i++) for (int j = i + 1; j < N; j++) for (int k = j + 1; k < N; k++) TIDX[(i * N + j) * N + k] = n++;
  if (n != NT3) { fprintf(stderr, "NT3 incoherent\n"); exit(1); }
  QIDX = malloc(sizeof(int32_t) * N * N * N * N); n = 0;
  for (int i = 0; i < N; i++) for (int j = i + 1; j < N; j++) for (int k = j + 1; k < N; k++) for (int l = k + 1; l < N; l++) {
    QIDX[((i * N + j) * N + k) * N + l] = n; QC[n][0] = i; QC[n][1] = j; QC[n][2] = k; QC[n][3] = l; n++; }
  if (n != NQ) { fprintf(stderr, "NQ incoherent\n"); exit(1); }
  /* canonisation des quadruplets par les 12 symetries (meme methode que 3v3) */
  int32_t *repOf = malloc(sizeof(int32_t) * NQ);
  for (int q = 0; q < NQ; q++) {
    int best = q, bg = 0;
    for (int g = 0; g < 12; g++) {
      int r = qid4(SYM[g][QC[q][0]], SYM[g][QC[q][1]], SYM[g][QC[q][2]], SYM[g][QC[q][3]]);
      if (r < best) { best = r; bg = g; }
    }
    repOf[q] = best; canonG4[q] = bg;
  }
  int32_t *rk = malloc(sizeof(int32_t) * NQ); for (int q = 0; q < NQ; q++) rk[q] = -1;
  REPQ = malloc(sizeof(int32_t) * NQ);
  for (int q = 0; q < NQ; q++) if (repOf[q] == q) { rk[q] = K4; REPQ[K4++] = q; }
  for (int q = 0; q < NQ; q++) repRank[q] = rk[repOf[q]];
  free(repOf); free(rk);
}

/* consultation 3v2 : (paire faible, triplet fort, trait 0 = fort au trait) -> v (0 nulle, 1 gain du trait, 2 perte du trait) */
static inline void lookup32(int w0, int w1, int s0, int s1, int s2, int turn, int *v, int *d) {
  int wp = pid(w0, w1), g = canonG2[wp];
  const int8_t *S = SYM[g];
  size_t idx = ((size_t)canonRep2[wp] * NT3 + tid3(S[s0], S[s1], S[s2])) * 2 + turn;
  *v = st32[idx]; *d = dt32[idx];
}

static inline size_t idx42(const int *A, const int *B, int turn) {
  int q = qid4(A[0], A[1], A[2], A[3]);
  const int8_t *S = SYM[(int)canonG4[q]];
  return ((size_t)repRank[q] * NP + pid(S[B[0]], S[B[1]])) * 2 + turn;
}

/* ---- generateur de coups : logique de succ() de generate-3v3.js, a 4 billes ---- */
typedef struct { int8_t own[4], opp[4], no, nop, ej; } Mv;
static Mv MV[512];
static int8_t occ[N];
static int nmv;
static void put(const int *nc, int n, const int *mc, int m, int ej) {
  Mv *x = &MV[nmv++];
  for (int i = 0; i < 4; i++) { x->own[i] = i < n ? nc[i] : -1; x->opp[i] = i < m ? mc[i] : -1; }
  x->no = n; x->nop = m; x->ej = ej;
}
static int inG(int c, const int *G, int n) { for (int i = 0; i < n; i++) if (G[i] == c) return 1; return 0; }
static int succ(const int *own, int no, const int *opp, int nop) {
  for (int i = 0; i < no; i++) occ[own[i]] = 1;
  for (int i = 0; i < nop; i++) occ[opp[i]] = 2;
  nmv = 0;
  int nc[4], mc[4];
  for (int gi = 0; gi < no; gi++) {
    int i = own[gi];
    for (int d = 0; d < 6; d++) {
      int t = NBI[i * 6 + d]; if (t == -1 || occ[t] != 0) continue;
      int k = 0; for (int s = 0; s < no; s++) if (own[s] != i) nc[k++] = own[s];
      nc[k] = t; for (int s = 0; s < nop; s++) mc[s] = opp[s];
      put(nc, no, mc, nop, 0);
    }
    for (int a = 0; a < 3; a++) {
      int j = NBI[i * 6 + a]; if (j == -1 || occ[j] != 1) continue;
      int k3 = NBI[j * 6 + a];
      int Gs[2][3] = {{i, j, -1}, {i, j, k3}};
      int ng = (k3 != -1 && occ[k3] == 1) ? 2 : 1;
      for (int gg = 0; gg < ng; gg++) {
        int *G = Gs[gg], n = gg == 0 ? 2 : 3;
        for (int d = 0; d < 6; d++) {
          if (d == a || d == (a + 3) % 6) {
            int head = (d == a) ? G[n - 1] : G[0], tail = (d == a) ? G[0] : G[n - 1];
            int front = NBI[head * 6 + d]; if (front == -1) continue;
            if (occ[front] == 1) continue;
            if (occ[front] == 0) {
              int k = 0; for (int s = 0; s < no; s++) if (!inG(own[s], G, n)) nc[k++] = own[s];
              for (int s = 0; s < n; s++) if (G[s] != tail) nc[k++] = G[s];
              nc[k++] = front; for (int s = 0; s < nop; s++) mc[s] = opp[s];
              put(nc, no, mc, nop, 0); continue;
            }
            int kk = 0, p = front;
            while (p != -1 && occ[p] == 2 && kk < 3) { kk++; p = NBI[p * 6 + d]; }
            if (kk >= n || kk > 2) continue;
            if (p != -1 && occ[p] != 0) continue;
            int pushed[3], q = front; for (int s = 0; s < kk; s++) { pushed[s] = q; q = NBI[q * 6 + d]; }
            int m = 0, ej = 0;
            for (int s = 0; s < nop; s++) {
              int hit = 0; for (int u = 0; u < kk; u++) if (pushed[u] == opp[s]) hit = 1;
              if (!hit) { mc[m++] = opp[s]; continue; }
              int to = NBI[opp[s] * 6 + d];
              if (to == -1) ej = 1; else mc[m++] = to;
            }
            int k2 = 0; for (int s = 0; s < no; s++) if (!inG(own[s], G, n)) nc[k2++] = own[s];
            for (int s = 0; s < n; s++) if (G[s] != tail) nc[k2++] = G[s];
            nc[k2++] = front; put(nc, no, mc, m, ej);
          } else {
            int ok = 1;
            for (int s = 0; s < n; s++) { int t = NBI[G[s] * 6 + d]; if (t == -1 || occ[t] != 0) { ok = 0; break; } }
            if (!ok) continue;
            int k2 = 0; for (int s = 0; s < no; s++) if (!inG(own[s], G, n)) nc[k2++] = own[s];
            for (int s = 0; s < n; s++) nc[k2++] = NBI[G[s] * 6 + d];
            for (int s = 0; s < nop; s++) mc[s] = opp[s];
            put(nc, no, mc, nop, 0);
          }
        }
      }
    }
  }
  for (int i = 0; i < no; i++) occ[own[i]] = 0;
  for (int i = 0; i < nop; i++) occ[opp[i]] = 0;
  return nmv;
}

static inline void decoder(size_t idx, int *A, int *B, int *turn) {
  *turn = idx & 1; size_t base = idx >> 1;
  int r = base / NP, p = base % NP, q = REPQ[r];
  for (int i = 0; i < 4; i++) A[i] = QC[q][i];
  B[0] = PA[p][0]; B[1] = PA[p][1];
}
static inline int legal(const int *A, const int *B) {
  for (int i = 0; i < 4; i++) if (A[i] == B[0] || A[i] == B[1]) return 0;
  return 1;
}

/* Parite : un gain se termine par un coup du gagnant (profondeur impaire), une perte
   par un coup adverse (profondeur paire) -- verifie sur la table 3v2 au demarrage.
   A un niveau impair on ne cherche donc que des gains, a un niveau pair que des pertes. */
static int evaluer(const int *A, const int *B, int turn, int d);
static int evaluer_niveau(const int *A, const int *B, int turn, int d) {
  int r = evaluer(A, B, turn, d);
  if (r == 1 && !(d & 1)) { fprintf(stderr, "PARITE VIOLEE : gain au niveau pair %d\n", d); exit(3); }
  if (r == 2 && (d & 1)) { fprintf(stderr, "PARITE VIOLEE : perte au niveau impair %d\n", d); exit(3); }
  return r;
}

/* Sur-ensemble des PREDECESSEURS d'une position C, par un coup sans ejection (une
   ejection change de classe de materiel : ses predecesseurs sont en 5v2 ou 4v3).
   Le camp qui vient de jouer a deplace un groupe G (1 a 3 billes) d'un pas dans une
   direction, en poussant eventuellement 1 ou 2 billes adverses placees devant.
   On enumere TOUS les sous-ensembles de 1 a 3 billes, les 6 directions et 0 a 2
   billes poussees -- plus large que necessaire, jamais plus etroit : chaque candidat
   est ensuite juge par l'evaluateur exact, un candidat de trop ne coute que du temps. */
static uint8_t *cand;
static size_t nCand;
static void marquer(const int *A, const int *B, int t) {
  for (int i = 0; i < 4; i++) for (int j = i + 1; j < 4; j++) if (A[i] == A[j]) return;
  if (B[0] == B[1]) return;
  for (int i = 0; i < 4; i++) if (A[i] == B[0] || A[i] == B[1]) return;
  /* Une meme position peut occuper PLUSIEURS cases : quand les 4 billes fortes forment
     une figure elle-meme symetrique, plusieurs symetries les ramenent au representant
     canonique, et la paire faible peut alors etre rangee de plusieurs facons. On marque
     TOUTES ces cases -- en n'en marquant qu'une, la remontee oubliait des positions
     (constate au niveau 10 : 28 109 pertes au lieu des 28 110 du balayage complet). */
  int q = qid4(A[0], A[1], A[2], A[3]), rep = REPQ[repRank[q]];
  for (int g = 0; g < 12; g++) {
    const int8_t *S = SYM[g];
    if (qid4(S[A[0]], S[A[1]], S[A[2]], S[A[3]]) != rep) continue;
    size_t ci = ((size_t)repRank[q] * NP + pid(S[B[0]], S[B[1]])) * 2 + t;
    if (st[ci]) continue;
    if (!(cand[ci >> 3] & (1 << (ci & 7)))) { cand[ci >> 3] |= 1 << (ci & 7); nCand++; }
  }
}
static void predecesseurs(const int *A, const int *B, int tc) {
  int tp = 1 - tc, ny = tp == 0 ? 4 : 2, nx = tp == 0 ? 2 : 4;
  const int *Yn = tp == 0 ? A : B, *Xn = tp == 0 ? B : A;
  for (int mask = 1; mask < (1 << ny); mask++) {
    int nG = __builtin_popcount(mask); if (nG > 3) continue;
    for (int dir = 0; dir < 6; dir++) {
      int back = (dir + 3) % 6, Y[4], ok = 1;
      for (int i = 0; i < ny; i++) {
        if (mask & (1 << i)) { int g = NBI[Yn[i] * 6 + back]; if (g == -1) { ok = 0; break; } Y[i] = g; }
        else Y[i] = Yn[i];
      }
      if (!ok) continue;
      /* tetes possibles : billes du groupe dont la case devant n'est pas dans le groupe */
      for (int h = 0; h < ny; h++) {
        if (!(mask & (1 << h))) continue;
        int f = NBI[Yn[h] * 6 + dir], dansG = 0;
        for (int i = 0; i < ny; i++) if ((mask & (1 << i)) && Yn[i] == f) dansG = 1;
        if (dansG) continue;
        for (int k = 0; k <= 2 && k < nG; k++) {
          int X[4]; for (int i = 0; i < nx; i++) X[i] = Xn[i];
          int good = 1, cell = f;
          for (int s = 0; s < k; s++) {           /* la s-ieme bille poussee est en f + s*dir dans C */
            if (cell == -1) { good = 0; break; }
            int found = -1; for (int i = 0; i < nx; i++) if (Xn[i] == cell) found = i;
            if (found < 0) { good = 0; break; }
            X[found] = NBI[cell * 6 + back];            /* dans P elle etait un pas en arriere */
            cell = NBI[cell * 6 + dir];
          }
          if (!good) continue;
          if (tp == 0) marquer(Y, X, tp); else marquer(X, Y, tp);
        }
      }
    }
  }
}

/* Evalue une position au niveau d : 1 gain, 2 perte, 0 rien. Aussi utilise par verify (d = dt attendu). */
static int evaluer(const int *A, const int *B, int turn, int d) {
  const int *mine = turn == 0 ? A : B, *his = turn == 0 ? B : A;
  int c = succ(mine, turn == 0 ? 4 : 2, his, turn == 0 ? 2 : 4);
  for (int s = 0; s < c; s++) {
    Mv *m = &MV[s];
    if (m->ej) {
      if (turn == 0) { if (d == 1) return 1; continue; }             /* le faible tombe a 1 bille : fin */
      int v, dd; lookup32(m->own[0], m->own[1], m->opp[0], m->opp[1], m->opp[2], 0, &v, &dd);
      if (v == 2 && dd + 1 == d) return 1;
      continue;
    }
    int nA[4], nB[2];
    if (turn == 0) { for (int i = 0; i < 4; i++) nA[i] = m->own[i]; nB[0] = m->opp[0]; nB[1] = m->opp[1]; }
    else { for (int i = 0; i < 4; i++) nA[i] = m->opp[i]; nB[0] = m->own[0]; nB[1] = m->own[1]; }
    size_t ci = idx42(nA, nB, 1 - turn);
    if (st[ci] == 2 && dt[ci] == d - 1) return 1;
  }
  if (c == 0) return 0;
  int maxD = 0;
  for (int s = 0; s < c; s++) {
    Mv *m = &MV[s];
    if (m->ej) {
      if (turn == 0) return 0;                                     /* j'ejecte le dernier : jamais une perte */
      int v, dd; lookup32(m->own[0], m->own[1], m->opp[0], m->opp[1], m->opp[2], 0, &v, &dd);
      if (v == 1) { if (dd > maxD) maxD = dd; continue; }
      return 0;
    }
    int nA[4], nB[2];
    if (turn == 0) { for (int i = 0; i < 4; i++) nA[i] = m->own[i]; nB[0] = m->opp[0]; nB[1] = m->opp[1]; }
    else { for (int i = 0; i < 4; i++) nA[i] = m->opp[i]; nB[0] = m->own[0]; nB[1] = m->own[1]; }
    size_t ci = idx42(nA, nB, 1 - turn);
    if (st[ci] == 1) { if (dt[ci] > maxD) maxD = dt[ci]; continue; }
    return 0;
  }
  return maxD == d - 1 ? 2 : 0;
}


/* Une nulle est coherente si aucun coup ne gagne (ni ejection finale, ni coup vers une
   perte adverse, ni ejection vers une position 3v2 perdue par l'adversaire) et si les
   coups ne menent pas TOUS a un gain adverse (sinon ce serait une perte). */
static int nulle_coherente(const int *A, const int *B, int turn) {
  const int *mine = turn == 0 ? A : B, *his = turn == 0 ? B : A;
  int c = succ(mine, turn == 0 ? 4 : 2, his, turn == 0 ? 2 : 4), tousGagnants = c > 0;
  for (int s = 0; s < c; s++) {
    Mv *m = &MV[s];
    if (m->ej) {
      if (turn == 0) return 0;
      int v, dd; lookup32(m->own[0], m->own[1], m->opp[0], m->opp[1], m->opp[2], 0, &v, &dd);
      if (v == 2) return 0;
      if (v != 1) tousGagnants = 0;
      continue;
    }
    int nA[4], nB[2];
    if (turn == 0) { for (int i = 0; i < 4; i++) nA[i] = m->own[i]; nB[0] = m->opp[0]; nB[1] = m->opp[1]; }
    else { for (int i = 0; i < 4; i++) nA[i] = m->opp[i]; nB[0] = m->own[0]; nB[1] = m->own[1]; }
    size_t ci = idx42(nA, nB, 1 - turn);
    if (st[ci] == 2) return 0;
    if (st[ci] != 1) tousGagnants = 0;
  }
  return !tousGagnants;
}

static uint64_t reprise_i = 0, reprise_w = 0, reprise_l = 0;
/* Profondeur minimale de gain parmi tous les coups (0 si aucun coup gagnant) --
   sert a PROUVER qu'aucune victoire n'a ete datee plus tard que son minimum. */
static int gain_minimal(const int *A, const int *B, int turn) {
  const int *mine = turn == 0 ? A : B, *his = turn == 0 ? B : A;
  int c = succ(mine, turn == 0 ? 4 : 2, his, turn == 0 ? 2 : 4), best = 0;
  for (int s = 0; s < c; s++) {
    Mv *m = &MV[s]; int d = 0;
    if (m->ej) {
      if (turn == 0) d = 1;
      else { int v, dd; lookup32(m->own[0], m->own[1], m->opp[0], m->opp[1], m->opp[2], 0, &v, &dd); if (v == 2) d = dd + 1; }
    } else {
      int nA[4], nB[2];
      if (turn == 0) { for (int i = 0; i < 4; i++) nA[i] = m->own[i]; nB[0] = m->opp[0]; nB[1] = m->opp[1]; }
      else { for (int i = 0; i < 4; i++) nA[i] = m->opp[i]; nB[0] = m->own[0]; nB[1] = m->own[1]; }
      size_t ci = idx42(nA, nB, 1 - turn);
      if (st[ci] == 2) d = dt[ci] + 1;
    }
    if (d && (!best || d < best)) best = d;
  }
  return best;
}

static void sauver(const char *nom, int niveau) {
  char tmp[256]; snprintf(tmp, sizeof tmp, "%s.tmp", nom);
  FILE *f = fopen(tmp, "wb"); uint32_t h = niveau;
  fwrite(&h, 4, 1, f); fwrite(&reprise_i, 8, 1, f); fwrite(&reprise_w, 8, 1, f); fwrite(&reprise_l, 8, 1, f);
  fwrite(st, 1, TOTAL, f); fwrite(dt, 1, TOTAL, f); fclose(f);
  rename(tmp, nom);                          /* ecriture atomique : jamais de reprise a moitie ecrite */
}
static int charger(const char *nom) {
  FILE *f = fopen(nom, "rb"); if (!f) return -1; uint32_t h;   /* -1 = absent ou illisible ; 0 = table finale */
  if (fread(&h, 4, 1, f) != 1 || fread(&reprise_i, 8, 1, f) != 1 || fread(&reprise_w, 8, 1, f) != 1 || fread(&reprise_l, 8, 1, f) != 1 ||
      fread(st, 1, TOTAL, f) != TOTAL || fread(dt, 1, TOTAL, f) != TOTAL) { fclose(f); return -1; }
  fclose(f); return (int)h;
}

int main(int argc, char **argv) {
  const char *mode = argc > 1 ? argv[1] : "solve";
  charger_ref();
  TOTAL = (size_t)K4 * NP * 2;
  { size_t viol = 0, T32 = (size_t)K2 * NT3 * 2;
    for (size_t i = 0; i < T32; i++) { if (st32[i] == 1 && !(dt32[i] & 1)) viol++; if (st32[i] == 2 && (dt32[i] & 1)) viol++; }
    if (viol) { fprintf(stderr, "parite non respectee dans la table 3v2 (%zu entrees) -- arret\n", viol); return 3; } }
  fprintf(stderr, "quadruplets %d, orbites %d, espace %zu positions\n", NQ, K4, TOTAL);

  if (!strcmp(mode, "lookup")) {           /* compare la consultation 3v2 a celle du JS */
    int a[8], ok = 0, ko = 0;
    while (scanf("%d %d %d %d %d %d %d %d", &a[0], &a[1], &a[2], &a[3], &a[4], &a[5], &a[6], &a[7]) == 8) {
      int v, d; lookup32(a[0], a[1], a[2], a[3], a[4], a[5], &v, &d);
      if (v == a[6] && d == a[7]) ok++; else ko++;
    }
    printf("lookup 3v2 : %d identiques, %d differents\n", ok, ko); return ko != 0;
  }
  if (!strcmp(mode, "gen")) {              /* successeurs d'une position : "4 cases fortes, 2 faibles, trait" */
    int A[4], B[2], t;
    while (scanf("%d %d %d %d %d %d %d", &A[0], &A[1], &A[2], &A[3], &B[0], &B[1], &t) == 7) {
      const int *mine = t == 0 ? A : B, *his = t == 0 ? B : A;
      int c = succ(mine, t == 0 ? 4 : 2, his, t == 0 ? 2 : 4);
      printf("%d", c);
      for (int s = 0; s < c; s++) {
        printf(" |");
        for (int i = 0; i < MV[s].no; i++) printf(" %d", MV[s].own[i]);
        printf(" /");
        for (int i = 0; i < MV[s].nop; i++) printf(" %d", MV[s].opp[i]);
      }
      printf("\n");
    }
    return 0;
  }

  st = calloc(TOTAL, 1); dt = calloc(TOTAL, 1); cand = malloc((TOTAL >> 3) + 1);
  if (!st || !dt) { fprintf(stderr, "memoire insuffisante\n"); return 1; }
  const char *CK = "tb42_ckpt.bin";

  if (!strcmp(mode, "solve")) {
    int debut = charger(CK);
    if (debut > 0) fprintf(stderr, "REPRISE au niveau %d\n", debut);
    else {
      debut = 1; size_t nl = 0;                          /* marque les positions impossibles (billes superposees) */
      for (size_t i = 0; i < TOTAL; i++) { int A[4], B[2], t; decoder(i, A, B, &t); if (!legal(A, B)) st[i] = 3; else nl++; }
      fprintf(stderr, "positions legales : %zu\n", nl);
      sauver(CK, 1);
    }
    /* budget de temps par appel (secondes, argument 2) : au-dela, sauvegarde EN COURS
       de niveau (index atteint) et sortie propre ; relancer la meme commande reprend. */
    time_t fin = time(NULL) + (argc > 2 ? atoi(argv[2]) : 240);
    cand = malloc((TOTAL >> 3) + 1);
    for (int d = debut; d < 250; d++) {
      time_t t0 = time(NULL); size_t nW = reprise_w, nL = reprise_l;
      if (d <= 9) {                                 /* plein balayage : la table 3v2 peut encore declencher */
        for (size_t i = reprise_i; i < TOTAL; i++) {
          if ((i & 0xFFFFF) == 0 && time(NULL) >= fin) {
            reprise_i = i; reprise_w = nW; reprise_l = nL; sauver(CK, d);
            fprintf(stderr, "PAUSE niveau %d a %.1f %% -- relancer pour reprendre\n", d, 100.0 * i / TOTAL);
            return 0;
          }
          if (st[i]) continue;
          int A[4], B[2], t; decoder(i, A, B, &t);
          int r = evaluer_niveau(A, B, t, d);
          if (r) { st[i] = r; dt[i] = d; if (r == 1) nW++; else nL++; }
        }
      } else {                                      /* remontee : predecesseurs des positions resolues en d-1 */
        memset(cand, 0, (TOTAL >> 3) + 1); nCand = 0; size_t nSrc = 0;
        for (size_t i = 0; i < TOTAL; i++) {
          if ((st[i] == 1 || st[i] == 2) && dt[i] == d - 1) { int A[4], B[2], t; decoder(i, A, B, &t); predecesseurs(A, B, t); nSrc++; }
        }
        for (size_t by = 0; by <= (TOTAL >> 3); by++) {
          if (!cand[by]) continue;
          for (int b = 0; b < 8; b++) {
            if (!(cand[by] & (1 << b))) continue;
            size_t i = (by << 3) | b; if (i >= TOTAL || st[i]) continue;
            int A[4], B[2], t; decoder(i, A, B, &t);
            int r = evaluer_niveau(A, B, t, d);
            if (r) { st[i] = r; dt[i] = d; if (r == 1) nW++; else nL++; }
          }
        }
        fprintf(stderr, "  (remontee : %zu positions sources, %zu candidats)\n", nSrc, nCand);
      }
      fprintf(stderr, "niveau %3d : +%zu gains +%zu pertes (%lds)\n", d, nW, nL, (long)(time(NULL) - t0));
      reprise_i = 0; reprise_w = 0; reprise_l = 0;
      if (nW + nL == 0 && d >= 10) break;
      sauver(CK, d + 1);
      if (time(NULL) >= fin) { fprintf(stderr, "PAUSE apres le niveau %d -- relancer pour reprendre\n", d); return 0; }
    }
    sauver("tb42.bin", 0); remove(CK);
    fprintf(stderr, "TERMINE -- table ecrite : tb42.bin\n");
    return 0;
  }

  if (!strcmp(mode, "compter")) {          /* resolutions par profondeur, relues dans la sauvegarde */
    if (!charger(CK)) { fprintf(stderr, "reprise absente\n"); return 1; }
    size_t h[256] = {0};
    for (size_t i = 0; i < TOTAL; i++) if (st[i] == 1 || st[i] == 2) h[dt[i]]++;
    for (int d = 1; d < 256; d++) if (h[d]) printf("%d %zu\n", d, h[d]);
    return 0;
  }
  if (!strcmp(mode, "revenir")) {
    int d = argc > 2 ? atoi(argv[2]) : 10;
    if (!charger(CK)) { fprintf(stderr, "reprise absente\n"); return 1; }
    size_t n = 0;
    for (size_t i = 0; i < TOTAL; i++) if ((st[i] == 1 || st[i] == 2) && dt[i] >= d) { st[i] = 0; dt[i] = 0; n++; }
    reprise_i = 0; reprise_w = 0; reprise_l = 0; sauver(CK, d);
    printf("%zu resolutions de niveau >= %d effacees ; reprise fixee au niveau %d\n", n, d, d);
    return 0;
  }
  if (!strcmp(mode, "manque")) {           /* rebalaye un niveau d : positions que la remontee a oubliees */
    int d = argc > 2 ? atoi(argv[2]) : 10;
    if (!charger(CK)) { fprintf(stderr, "reprise absente\n"); return 1; }
    size_t n = 0;
    for (size_t i = 0; i < TOTAL; i++) {
      if (st[i]) continue;
      int A[4], B[2], t; decoder(i, A, B, &t);
      int r = evaluer(A, B, t, d); if (!r) continue;
      if (++n > 3) continue;
      printf("OUBLI niveau %d : fort %d %d %d %d | faible %d %d | trait %s | %s\n", d, A[0], A[1], A[2], A[3], B[0], B[1], t ? "faible" : "fort", r == 1 ? "gain" : "perte");
      const int *mine = t == 0 ? A : B, *his = t == 0 ? B : A;
      int cc = succ(mine, t == 0 ? 4 : 2, his, t == 0 ? 2 : 4);
      for (int s = 0; s < cc; s++) {
        Mv *m = &MV[s]; if (m->ej) continue;
        int nA[4], nB[2];
        if (t == 0) { for (int k = 0; k < 4; k++) nA[k] = m->own[k]; nB[0] = m->opp[0]; nB[1] = m->opp[1]; }
        else { for (int k = 0; k < 4; k++) nA[k] = m->opp[k]; nB[0] = m->own[0]; nB[1] = m->own[1]; }
        size_t ci = idx42(nA, nB, 1 - t);
        if ((st[ci] == 1 || st[ci] == 2) && dt[ci] == d - 1) {
          printf("   suite en %d : fort %d %d %d %d | faible %d %d\n", d - 1, nA[0], nA[1], nA[2], nA[3], nB[0], nB[1]);
          int cA[4], cB[2], ct; decoder(ci, cA, cB, &ct);
          memset(cand, 0, (TOTAL >> 3) + 1); nCand = 0;
          predecesseurs(cA, cB, ct);
          printf("   forme canonique de la suite : fort %d %d %d %d | faible %d %d ; %zu predecesseurs generes ; position oubliee parmi eux : %s\n",
                 cA[0], cA[1], cA[2], cA[3], cB[0], cB[1], nCand, (cand[i >> 3] & (1 << (i & 7))) ? "OUI" : "NON");
          break;
        }
      }
    }
    printf("niveau %d : %zu positions oubliees par la remontee\n", d, n);
    return 0;
  }
  if (charger("tb42.bin") < 0) { fprintf(stderr, "tb42.bin absent\n"); return 1; }
  if (!strcmp(mode, "pv")) {             /* ligne principale : le fort gagne au plus vite, le faible resiste au plus long */
    int A[4], B[2], t = 0;
    for (int i = 0; i < 4; i++) A[i] = atoi(argv[2 + i]);
    B[0] = atoi(argv[6]); B[1] = atoi(argv[7]);
    for (int ply = 0; ply < 300; ply++) {
      printf("%d %d %d %d %d %d %d\n", A[0], A[1], A[2], A[3], B[0], B[1], t);
      size_t ci0 = idx42(A, B, t); int d = dt[ci0];
      const int *mine = t == 0 ? A : B, *his = t == 0 ? B : A;
      int c2 = succ(mine, t == 0 ? 4 : 2, his, t == 0 ? 2 : 4), choix = -1, best = -1;
      for (int s = 0; s < c2; s++) {
        Mv *m = &MV[s];
        if (t == 0) {
          if (m->ej) { if (d == 1) { choix = s; break; } continue; }
          int nA[4] = {m->own[0], m->own[1], m->own[2], m->own[3]}, nB[2] = {m->opp[0], m->opp[1]};
          size_t ci = idx42(nA, nB, 1); if (st[ci] == 2 && dt[ci] == d - 1) { choix = s; break; }
        } else {
          if (m->ej) continue;                      /* dans une position perdue, capturer ne sauve pas : on prend le plus long hors capture */
          int nA[4] = {m->opp[0], m->opp[1], m->opp[2], m->opp[3]}, nB[2] = {m->own[0], m->own[1]};
          size_t ci = idx42(nA, nB, 0); if (st[ci] == 1 && dt[ci] > best) { best = dt[ci]; choix = s; }
        }
      }
      if (choix < 0) { printf("FIN\n"); break; }
      Mv *m = &MV[choix];
      if (t == 0 && m->ej) { printf("EJECTION %d %d %d %d | %d\n", m->own[0], m->own[1], m->own[2], m->own[3], m->opp[0]); break; }
      if (t == 0) { for (int i = 0; i < 4; i++) A[i] = m->own[i]; B[0] = m->opp[0]; B[1] = m->opp[1]; }
      else { for (int i = 0; i < 4; i++) A[i] = m->opp[i]; B[0] = m->own[0]; B[1] = m->own[1]; }
      t = 1 - t;
    }
    return 0;
  }
  if (!strcmp(mode, "perdant")) {          /* une position (fort au trait, gain en 9..25) ou un coup laisse echapper le gain */
    for (size_t i = 0; i < TOTAL; i += 2) {
      if (st[i] != 1 || dt[i] < 9 || dt[i] > 25) continue;
      int A[4], B[2], t; decoder(i, A, B, &t);
      int cc = succ(A, 4, B, 2);
      for (int s = 0; s < cc; s++) {
        Mv *m = &MV[s]; if (m->ej) continue;
        int nA[4], nB[2]; for (int k = 0; k < 4; k++) nA[k] = m->own[k]; nB[0] = m->opp[0]; nB[1] = m->opp[1];
        size_t ci = idx42(nA, nB, 1);
        if (st[ci] == 0) { printf("%d %d %d %d %d %d %d\n", A[0], A[1], A[2], A[3], B[0], B[1], dt[i]); return 0; }
      }
    }
    printf("aucune\n"); return 0;
  }
  if (!strcmp(mode, "shards")) {           /* export pour le jeu : 1 octet par position, par blocs d'orbites */
    /* octet = profondeur (1..98) si gain ou perte, 0 si nulle ou position impossible.
       Le statut se deduit de la PARITE : impair = gain du camp au trait, pair = perte.
       Morceau k = orbites [64k, 64k+64[ ; dans un morceau : ((rang%64)*NP + paire)*2 + trait. */
    int R = 64, nS = (K4 + R - 1) / R; size_t viol = 0;
    for (size_t i = 0; i < TOTAL; i++) {
      if (st[i] == 1 && !(dt[i] & 1)) viol++;
      if (st[i] == 2 && (dt[i] & 1)) viol++;
    }
    if (viol) { fprintf(stderr, "parite violee : %zu -- export refuse\n", viol); return 1; }
    uint8_t *buf = malloc((size_t)R * NP * 2);
    for (int k = 0; k < nS; k++) {
      int r0 = k * R, r1 = r0 + R > K4 ? K4 : r0 + R;
      size_t n = (size_t)(r1 - r0) * NP * 2, base = (size_t)r0 * NP * 2;
      for (size_t j = 0; j < n; j++) { size_t i = base + j; buf[j] = (st[i] == 1 || st[i] == 2) ? dt[i] : 0; }
      char nom[64]; snprintf(nom, sizeof nom, "shards/s%03d.bin", k);
      FILE *f = fopen(nom, "wb"); fwrite(buf, 1, n, f); fclose(f);
    }
    { /* carte des representants : bit q = 1 si le quadruplet de rang q est le representant de son orbite */
      uint8_t *bm = calloc((NQ + 7) / 8, 1);
      for (int r = 0; r < K4; r++) bm[REPQ[r] >> 3] |= 1 << (REPQ[r] & 7);
      FILE *f = fopen("shards/orbites.bin", "wb"); fwrite(bm, 1, (NQ + 7) / 8, f); fclose(f); free(bm); }
    printf("%d morceaux ecrits (K4=%d, NP=%d, %d orbites par morceau) + carte des orbites\n", nS, K4, NP, R);
    return 0;
  }
  if (!strcmp(mode, "query")) {          /* "nA a.. nB b.. trait" -> "v dt" (v : 1 gain / 2 perte du trait, 0 nulle ; F = partie finie) */
    int nA, nB, A[4], B[4], t;
    while (scanf("%d", &nA) == 1) {
      for (int i = 0; i < nA; i++) if (scanf("%d", &A[i]) != 1) return 1;
      if (scanf("%d", &nB) != 1) return 1;
      for (int i = 0; i < nB; i++) if (scanf("%d", &B[i]) != 1) return 1;
      if (scanf("%d", &t) != 1) return 1;
      if (nB <= 1) { printf("F\n"); continue; }                         /* le faible est tombe a 1 bille */
      if (nA == 3 && nB == 2) { int v, d; lookup32(B[0], B[1], A[0], A[1], A[2], t, &v, &d); printf("%d %d\n", v, d); continue; }
      if (nA == 4 && nB == 2) { size_t ci = idx42(A, B, t); printf("%d %d\n", st[ci] == 3 ? 9 : st[ci], dt[ci]); continue; }
      printf("X\n");
    }
    return 0;
  }
  if (!strcmp(mode, "stats")) {
    size_t w[2] = {0, 0}, l[2] = {0, 0}, dr[2] = {0, 0}, hist[256] = {0}; int md = 0; size_t deep = 0;
    for (size_t i = 0; i < TOTAL; i++) {
      if (st[i] == 3) continue; int t = i & 1;
      if (st[i] == 1) { w[t]++; hist[dt[i]]++; if (dt[i] > md) { md = dt[i]; deep = i; } }
      else if (st[i] == 2) l[t]++; else dr[t]++;
    }
    printf("fort au trait  : gains %zu  pertes %zu  nulles %zu\n", w[0], l[0], dr[0]);
    printf("faible au trait: gains %zu  pertes %zu  nulles %zu\n", w[1], l[1], dr[1]);
    printf("DTW max %d ; histogramme des gains :", md); for (int k = 1; k <= md; k++) printf(" %d:%zu", k, hist[k]); printf("\n");
    int A[4], B[2], t; decoder(deep, A, B, &t);
    printf("gain le plus profond : fort %d %d %d %d | faible %d %d | trait %s\n", A[0], A[1], A[2], A[3], B[0], B[1], t ? "faible" : "fort");
    return 0;
  }
  if (!strcmp(mode, "verifyall")) {        /* TOUTES les positions, equations exactes ; tranche k sur K */
    size_t bad = 0, n = 0;
    int k = argc > 2 ? atoi(argv[2]) : 0, K = argc > 3 ? atoi(argv[3]) : 1;
    size_t debutT = TOTAL / K * k, finT = (k == K - 1) ? TOTAL : TOTAL / K * (k + 1);
    for (size_t i = debutT; i < finT; i++) {
      if (st[i] == 3) continue; n++;
      int A[4], B[2], t; decoder(i, A, B, &t);
      if (st[i] == 1) { if (gain_minimal(A, B, t) != dt[i]) bad++; }
      else if (st[i] == 2) { if (evaluer(A, B, t, dt[i]) != 2) bad++; }
      else if (!nulle_coherente(A, B, t)) bad++;
    }
    printf("tranche %d/%d : %zu positions verifiees, %zu incoherences\n", k + 1, K, n, bad);
    return bad != 0;
  }
  if (!strcmp(mode, "verify")) {           /* recontrole a posteriori sur un echantillon aleatoire */
    uint64_t s = 88172645463325252ULL; size_t n = 0, bad = 0, nw = 0, nl = 0;
    while (n < 300000) {
      s ^= s << 13; s ^= s >> 7; s ^= s << 17; size_t i = s % TOTAL;
      if (st[i] == 3) continue; n++;
      int A[4], B[2], t; decoder(i, A, B, &t);
      if (st[i] == 1) { nw++; if (evaluer(A, B, t, dt[i]) != 1) bad++; }
      else if (st[i] == 2) { nl++; if (evaluer(A, B, t, dt[i]) != 2) bad++; }
      else if (!nulle_coherente(A, B, t)) bad++;
    }
    printf("verification : %zu positions (%zu gains, %zu pertes), %zu incoherences\n", n, nw, nl, bad);
    return bad != 0;
  }
  fprintf(stderr, "mode inconnu\n"); return 1;
}

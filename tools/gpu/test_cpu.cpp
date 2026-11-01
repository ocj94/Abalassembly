/* Le moteur GPU d'Abalassembly (abalone_gpu.cu), compile pour le processeur.
     g++ -O2 -std=c++17 -fopenmp tools/gpu/test_cpu.cpp -o /tmp/abalone_cpu
   Deux usages :
   - verif : lit des positions sur l'entree (format de verifier.js) et ecrit, pour chacune,
     les coups, l'evaluation et la note de chaque coup a profondeur 1 et 2 ; verifier.js les
     compare au moteur du site.
   - jouer departs.tsv prof marge ouverture maxp adj3 penal parties graine [cle] : des parties
     du moteur contre lui-meme, comme le carnet Colab, pour mesurer la vitesse et comparer ;
   - taches departs.tsv prof marge ouverture maxp adj3 penal graine < « indice numero » par ligne :
     les memes parties que le noyau « parties » de la carte graphique (meme graine), 8 entiers par partie. */
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <string>
#include <vector>
#include <algorithm>
#include <chrono>
#include "abalone_gpu.cu"

static Tab T;
static int RR[NCASES], CC[NCASES];

static std::string cle(const Coup& m) {   // moveKey du site : cases « r,c » triees, puis la direction
  const int DQ[6] = {1, -1, 0, 1, 0, -1}, DR[6] = {0, 0, -1, -1, 1, 1};
  std::vector<std::string> v; int c = m.a;
  for (int i = 0; i < m.n; i++) { v.push_back(std::to_string(RR[c]) + "," + std::to_string(CC[c])); if (i + 1 < m.n) c = T.nb[c][m.f]; }
  std::sort(v.begin(), v.end());
  std::string s; for (size_t i = 0; i < v.size(); i++) { if (i) s += "|"; s += v[i]; }
  return s + ">" + std::to_string(DQ[m.dir]) + "," + std::to_string(DR[m.dir]);
}

static void lirePlateau(const char* s, unsigned char* b) { for (int i = 0; i < NCASES; i++) b[i] = (unsigned char)(s[i] - '0'); }

int main(int argc, char** argv) {
  for (int i = 0; i < NCASES; i++) tabCase(T, i);
  { const int DEB[9] = {0, 5, 11, 18, 26, 35, 43, 50, 56}; for (int i = 0; i < NCASES; i++) { int r = 0; while (r < 8 && i >= DEB[r + 1]) r++; RR[i] = r; CC[i] = i - DEB[r]; } }
  if (argc > 1 && !strcmp(argv[1], "verif")) {
    /* une ligne par position : plateau cb cw camp prof nh h1 ... hn (nh plateaux de l'historique, le plus ancien d'abord) */
    static char buf[1 << 16];
    static Coup L[MAXC]; static int sc[MAXC];
    while (fgets(buf, sizeof buf, stdin)) {
      char* tok = strtok(buf, " \n"); if (!tok) continue;
      Etat e; lirePlateau(tok, e.b);
      e.cb = (unsigned char)atoi(strtok(0, " \n")); e.cw = (unsigned char)atoi(strtok(0, " \n"));
      int col = atoi(strtok(0, " \n")), profMax = atoi(strtok(0, " \n")), nh = atoi(strtok(0, " \n"));
      Hist h; h.n = 0;
      for (int j = 0; j < nh; j++) { Etat x; lirePlateau(strtok(0, " \n"), x.b); x.cb = x.cw = 0; histAjoute(h, x); }
      int debord = 0, n, best; u64 rng = 1;
      n = genCoups(e, T, col, L, MAXC, false, debord);
      std::vector<std::string> keys; for (int i = 0; i < n; i++) keys.push_back(cle(L[i]));
      std::vector<std::string> tri = keys; std::sort(tri.begin(), tri.end());
      printf("{\"n\":%d,\"coups\":\"", n);
      for (size_t i = 0; i < tri.size(); i++) printf("%s%s", i ? " " : "", tri[i].c_str());
      printf("\",\"evN\":%d,\"evB\":%d", evaluer(e, T, NOIR), evaluer(e, T, BLANC));
      for (int p = 1; p <= profMax; p++) {
        racine(e, col, p, 0, nh ? &h : 0, T, rng, L, sc, n, best, true, debord);
        printf(",\"best%d\":%d,\"notes%d\":{", p, best, p);
        for (int i = 0; i < n; i++) printf("%s\"%s\":%d", i ? "," : "", cle(L[i]).c_str(), sc[i]);
        printf("}");
      }
      printf(",\"debord\":%d}\n", debord);
      fflush(stdout);
    }
    return 0;
  }
  if ((argc > 10 && !strcmp(argv[1], "jouer")) || (argc > 9 && !strcmp(argv[1], "taches"))) {
    FILE* f = fopen(argv[2], "r"); if (!f) { perror(argv[2]); return 1; }
    std::vector<std::string> cles; std::vector<std::vector<unsigned char>> deps; std::vector<int> glob; char ligne[4096]; int ng = 0;
    while (fgets(ligne, sizeof ligne, f)) {
      if (ligne[0] == '#') continue;
      std::vector<std::string> ch; char* s = strtok(ligne, "\t\n"); while (s) { ch.push_back(s); s = strtok(0, "\t\n"); }
      if (ch.size() < 4) continue;
      int gi = ng++;
      if (argc > 11 && strcmp(argv[1], "jouer") == 0 && ch[0] != argv[11]) continue;
      std::vector<unsigned char> b(NCASES); for (int i = 0; i < NCASES; i++) b[i] = (unsigned char)(ch[3][i] - '0');
      cles.push_back(ch[0]); deps.push_back(b); glob.push_back(gi);
    }
    fclose(f);
    Params P; P.prof = atoi(argv[3]); P.marge = atoi(argv[4]); P.ouverture = atoi(argv[5]); P.maxp = atoi(argv[6]); P.adj3 = atoi(argv[7]); P.penal = atoi(argv[8]);
    if (!strcmp(argv[1], "taches")) {
      /* comme le noyau « parties » : une tache par ligne (indice du depart dans departs.tsv, numero de la partie),
         8 entiers par partie, avec la meme graine -- les memes parties que sur la carte graphique */
      u64 graine = strtoull(argv[9], 0, 10); std::vector<int> td, tn; int a, b2;
      while (scanf("%d %d", &a, &b2) == 2) { td.push_back(a); tn.push_back(b2); }
      int n = (int)td.size(); std::vector<int> out(8 * n);
      #pragma omp parallel for schedule(dynamic, 1)
      for (int g = 0; g < n; g++) {
        static thread_local Coup L[MAXC]; static thread_local int sc[MAXC]; static thread_local Hist h;
        Res R; int debord = 0;
        jouer(deps[td[g]].data(), P, graine ^ ((u64)td[g] << 32) ^ (u64)(unsigned)tn[g], T, R, L, sc, h, debord);
        int* o = &out[8 * g]; o[0] = R.gagnant; o[1] = R.why; o[2] = R.plies; o[3] = R.premiere; o[4] = R.cb; o[5] = R.cw; o[6] = debord; o[7] = (int)(R.emp & 0x7fffffffULL);
      }
      for (int g = 0; g < n; g++) { for (int j = 0; j < 8; j++) printf(j ? " %d" : "%d", out[8 * g + j]); printf("\n"); }
      return 0;
    }
    int G = atoi(argv[9]); u64 graine = strtoull(argv[10], 0, 10);
    for (size_t k = 0; k < deps.size(); k++) {
      std::vector<Res> R(G); std::vector<int> deb(G, 0);
      auto t0 = std::chrono::steady_clock::now();
      #pragma omp parallel for schedule(dynamic, 1)
      for (int g = 0; g < G; g++) {
        static thread_local Coup L[MAXC]; static thread_local int sc[MAXC]; static thread_local Hist h;
        jouer(deps[k].data(), P, graine ^ ((u64)glob[k] << 32) ^ (u64)g, T, R[g], L, sc, h, deb[g]);
      }
      double ms = std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now() - t0).count();
      int vN = 0, vB = 0, nul = 0, why[7] = {0}, avecEj = 0, d = 0; double pl = 0, pr = 0;
      std::vector<u64> emps; for (int g = 0; g < G; g++) emps.push_back(R[g].emp); std::sort(emps.begin(), emps.end());
      int distinctes = (int)(std::unique(emps.begin(), emps.end()) - emps.begin());
      for (int g = 0; g < G; g++) { if (R[g].gagnant == 1) vN++; else if (R[g].gagnant == 2) vB++; else nul++; why[R[g].why]++; pl += R[g].plies;
        if (R[g].premiere) { avecEj++; pr += R[g].premiere; } else pr += P.ouverture + P.maxp + 1; d += deb[g]; }
      printf("%s\tparties %d (%d distinctes)\tNoirs %d\tBlancs %d\tnulles %d\tpourquoi %d/%d/%d/%d/%d/%d\tdemi-coups %.1f\t1re ejection %.1f (%d avec)\tdebord %d\t%.0f ms\n",
             cles[k].c_str(), G, distinctes, vN, vB, nul, why[1], why[2], why[3], why[4], why[5], why[6], pl / G, pr / G, avecEj, d, ms);
      fflush(stdout);
    }
    return 0;
  }
  fprintf(stderr, "usage : verif < positions | jouer departs.tsv prof marge ouverture maxp adj3 penal parties graine [cle] | taches departs.tsv prof marge ouverture maxp adj3 penal graine < taches\n");
  return 1;
}

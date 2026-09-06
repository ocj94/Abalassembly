/* ═══════════════════════════════════════════════════════════
   LIVRE D'OUVERTURES (V13) — SÛR PAR CONSTRUCTION
   Principe : on ne calcule PAS de coordonnées (source d'erreurs).
   On exprime chaque coup légal généré par le moteur dans le style
   du livre (queue+arrivée_tête, ex. "i5f5"), puis on cherche le coup
   LÉGAL dont l'étiquette correspond à l'entrée du livre. Un coup
   illégal est donc impossible : au pire le livre ne renvoie rien et
   l'IA fait sa recherche normale.
   Couvre les coups EN LIGNE (la grande majorité des ouvertures).
   Les coups en flèche du livre ne se résolvent pas (repli sûr).
═══════════════════════════════════════════════════════════ */

// Notation "style livre" d'un coup : en ligne → queue_départ + tête_arrivée (ex. i5f5)
function moveToPlayStrategy(sel, dir, type) {
  if (!sel || !sel.length || !dir) return '';
  if (type === 'broadside') {
    // Coup en flèche : notation non gérée par le livre (repli) → on renvoie une forme
    // distincte (6 car.) qui ne matchera pas les entrées 4-car. du livre.
    return moveToABAPRO(sel, dir, type);
  }
  const ax = sel.map(function(s){ return rcToAxial(s.r, s.c); });
  const sorted = ax.slice().sort(function(a, b){
    return (a.q*dir.q + a.r*dir.r) - (b.q*dir.q + b.r*dir.r);
  });
  const tail = sorted[0];                       // bille la plus en arrière (projection min sur dir)
  const head = sorted[sorted.length - 1];       // bille de tête
  const tailRc = axialToRc(tail.q, tail.r);
  const headDest = axialToRc(head.q + dir.q, head.r + dir.r);
  if (!tailRc || !headDest) return '';
  return coordToABAPRO(tailRc.r, tailRc.c) + coordToABAPRO(headDest.r, headDest.c);
}

// Base d'ouvertures — Standard : séquences extraites de 45+ parties de l'élite
// (vincent, Airisson, ocj94, eobllor…, source AbalOnline). Belgian et German
// (ci-dessous) sont minés de la même façon depuis les 2589 vraies parties MIGS
// et les 117 vraies parties AbalOnline german_daisy — remplace un ancien book
// codé en dur (5 lignes fixes pour Belgian, 3 pour German), jamais issu de
// données réelles. Élagage : un coup n'apparaît que s'il a été joué dans au
// moins 2 parties différentes (freq>=2), pour écarter le bruit des coups
// uniques sans les confondre avec de vraies lignes connues.
// Clé = coups joués jusqu'ici (style livre, séparés par des virgules) ; valeur = coups suivants {from,to,freq}.
const OPENING_BOOK_STD_ENCODED = `0||a1d4:143,a5d5:96,a2d5:43,a4d4:27,a3d3:6,a2c2:5
0|a1d4|i5f5:44,i9f6:36,i8f5:13,i6f6:10,i7f4:5,g5f5:3
4|,g5f5|a2d5:1,a5d5:1,b2e5:1
7|g6f5|a2d5:1,a5d5:1
8|7f4|a2d5:1,a3d3:1,a5d5:1
10|5|b2e5:7,a5d5:5,a2d5:2,a3d6:1
11|,b2e5|i9g7:3,i5g5:1
16|,h7h9g6|a5d5:2
23|,a5d5|h6e6:1
17|i9g7|a2d5:2,a5d5:1
21|,a2d5|i6g6:1
6|6g7f5|a2d5:2
11|,a2d5|h5e5:1
6|7f6|a2d5:1,b2e5:1
5|i5f5|a2d5:23,a5d5:17,b2e5:1,b4e4:1
9|,a2d5|i9f6:10,i6f6:7,h5e5:2,g6f6:1,h9g8:1,i7f4:1
14|,h5e5|b2e5:2
19|,b2e5|i7f7:2
24|,i7f7|a4c6:1,a3d6:1
15|i6f6|b2e5:4,b5e5:2,c5d6:1
19|,b2e5|i7f7:4
24|,i7f7|a3d6:2,b3e6:1,a3d3:1
29|,a3d6|h9g8:1,i8g8:1
21|5e5|i7f7:2
24|,i7f7|b4e4:1,a3d6:1
16|9f6|b2e5:4,b5e5:4,a3d6:2
19|,a3d6|h5e5:1,h8e5:1
20|b2e5|i7f7:1,i8g8:1,h9g8:1,h6e6:1
21|5e5|h7e4:2,h6e6:1,i7f7:1
24|,h7e4|b4e4:2
29|,b4e4|g6e4:2
34|,g6e4,a4a5b4|h4g4:1
11|5d5|i9f6:10,i6f6:5,h5e5:1,i7f4:1
14|,i6f6|b2e5:2,b5e5:2,c4e4:1
19|,b2e5|i7f7:2
24|,i7f7|a4c6:1,a3d6:1
21|5e5|i7f7:2
24|,i7f7|b4e4:2
29|,b4e4|h7e4:1,i9i7:1
16|9f6|b2e5:3,a2c2:2,a4c6:2,b5e5:2,a3d6:1
19|,a2c2|h5e5:1,h7e4:1
21|4c6|h6e6:1,i7f4:1
20|b2e5|i7f7:2,h9g8:1
24|,i7f7|b1c2:1,b4e4:1
21|5e5|h4i5:1,i7f4:1
10|c4d4d5|i8g8:1,i9f6:1
6|6f6|a2d5:4,a5d5:3,b2e5:3
9|,a2d5|i5f5:2,h8e5:1,i7f7:1
14|,i5f5|b2e5:1,b5e5:1
11|5d5|i5f5:2,i8f5:1
14|,i5f5|b5e5:2
19|,b5e5|h6e6:1,i7f7:1
10|b2e5|i5f5:2,i8f5:1
14|,i5f5|a2d5:2
19|,a2d5|i7f7:2
24|,i7f7|a3d3:1,a3d6:1
6|7f4|a3d3:2,b2e5:2,a2d5:1
9|,a3d3|i6f6:1,i8f5:1
10|b2e5|i6f6:1,i8f5:1
8|7|a5d5:2
9|,a5d5|i6f6:1,i9f6:1
6|8f5|a2d5:7,a5d5:4,b2e5:2
9|,a2d5|h5e5:2,i6f6:2,i7f4:1,i9f6:1
14|,h5e5|b2e5:2
19|,b2e5|i6h5:1
15|i6f6|b2e5:1,b5e5:1
11|5d5|i6f6:3,i9f6:1
14|,i6f6|b2e5:2,a2c2:1
19|,b2e5|h7e4:1,i7f7:1
10|b2e5|h5e5:1,i9f6:1
6|9f6|a5d5:16,a2d5:10,b2e5:10
9|,a2d5|i8f5:8,h8e5:1,i7f7:1
14|,i8f5|b5e5:4,a3d6:2,b2e5:2
19|,a3d6|h8e5:2
24|,h8e5|a4c6:2
29|,a4c6|h6e6:1,i7f4:1
20|b2e5|h7e4:1,i7f4:1
21|5e5|i7f4:3,i7f7:1
24|,i7f4|b3e6:1,b4e4:1
11|5d5|h8e5:7,i5f5:5,i8f5:3
14|,h8e5|b6c6:2,a2c2:1,a3d6:1,b4e4:1,b5e5:1
19|,b6c6|i5f5:1,i8f5:1
15|i5f5|b5e5:5
19|,b5e5|h7e4:1,h9g8:1,h9i9:1,i7f4:1,i7f7:1
16|8f5|a2c2:1,b5e5:1,b6a5:1
10|b2e5|i5f5:6,i8f5:3,i7f7:1
14|,i5f5|a2d5:5,a5d5:1
19|,a2d5|i7f4:3,h9g8:1,i7f7:1
24|,i7f4|a3d6:2,a4c6:1
29|,a3d6|h4g4:1,i6g4:1
16|8f5|a5d5:2,a2d5:1
19|,a5d5|i7f4:1
1|2c2|i5f5:2,i8f5:2,i9f6:1
4|,i5f5|a3d3:1,a5d5:1
6|8f5|a1d4:1,a3d3:1
2|d5|i5f5:10,i6f6:7,i9f6:7,i8f5:6,g5f5:1,g6f6:1
4|,g5g7f4|a1d4:1,a4d4:1,b5e5:1
5|i5f5|a4d4:2,b5e5:2,a1d4:1,a3d6:1
9|,a4d4|i6f6:2
14|,i6f6|b5e5:2
19|,b5e5|h6e6:1,i7f7:1
10|b5e5|i6f6:1,i9f6:1
10|c4d5d4|i9f6:2,i6f6:1,i7f7:1
16|,i9f6|a5d5:2
21|,a5d5|h4i5:2
26|,h4i5|a3d3:1,a3d6:1
6|6f6|a4d4:2,b5e5:2,a1d4:1
9|,a4d4|i7f4:1,i8f5:1
10|b5e5|h8e5:1,i5f5:1
10|c4d5d4|i5f5:1,i8f5:1
6|8f5|a1d4:1,a4d4:1,b5e5:1
9|,c4d5d4|i6f6:1,i7f4:1,i9f6:1
6|9f6|a4d4:2,b5e5:2,a1d4:1
9|,a4d4|h8e5:1,i5f5:1
10|b5e5|i5f5:1
10|c4d5d4|i5f5:1,i8f5:1
1|3d3|i5f5:2,g7f7:1,i9f6:1
4|,g5g7f5|a5d5:1
5|i5f5|a2c2:1,a5d5:1
3|6|i5f5:1,i6f6:1,i9f6:1
1|4d4|i5f5:8,i9f6:5,i6f6:2,i8f5:2,h8g8:1,i7f4:1
4|,g5g7f5|a2d5:1,a5d5:1,b2e5:1,d4a4:1
6|6g7f5|a2d5:1,a5d5:1
5|i5f5|a2d5:4,a5d5:2,b2e5:2
9|,a2d5|i9f6:2,i6f6:1,i7f4:1
14|,i9f6|a5a4:1,b5e5:1
11|5d5|i6f6:1,i9f6:1
10|b2e5|h5e5:2
14|,h5e5|b1b2:1,b3e6:1
6|6f6|b2e5:2
9|,b2e5|i8f5:2
14|,i8f5|a5d5:2
19|,a5d5|i7f7:2
24|,i7f7|b4e4:2
29|,b4e4|f7f4:1,h9g8:1
6|8f5|a2d5:2
9|,a2d5|h7e4:1,i6f6:1
6|9f6|a5d5:2,a2d5:1,b2e5:1,c5d5:1
9|,a5d5|h6e6:1,i8f5:1
1|5d5|i5f5:23,i9f6:19,i8f5:16,i6f6:5,i7f4:4,g5f4:2
4|,g5f4|a1d4:2
9|,a1d4|h9g8:1,i5g5:1
8|5|b5e5:2
9|,b5e5|f5e4:1,i5g5:1
7|g6f5|b5e5:3,a1d4:1,a4d4:1,a4c6:1
11|,b5e5|h8e5:2,g7f7:1
16|,h8e5|b4e4:1,b6b5:1
8|7f4|a4d4:4,a1d4:3,b5e5:2
11|,a4d4,h6h8g5|b5e5:1
12|b5e5|i5g5:1
10|5|a1d4:2,b5e5:1
5|i5f5|b5e5:12,a1d4:6,a4d4:3,b6a5:1,b6c6:1
9|,a1d4|i6f6:3,i9f6:3
14|,i6f6|b2e5:2,b5e5:1
19|,b2e5|h7e4:1,i7f7:1
16|9f6|b5e5:2,b1a1:1
19|,b5e5|h6e6:1,h9g8:1
11|4d4|i9f6:2,i6f6:1
14|,i9f6|a3d3:2
19|,a3d3|h5e5:2
24|,h5e5|a2c2:1,b1c2:1
10|b5e5|i9f6:6,i6f6:5,h4i5:1
14|,i6f6|a1d4:3,a4d4:2
19|,a1d4|i7f7:2,i7f4:1
24|,i7f7|b6b5:1,b6c6:1
21|4d4|i7f7:2
24|,i7f7|b3e6:1,b4e4:1
16|9f6|a4d4:4,a1d4:1,b2d4:1
19|,a4d4|h4i5:1,h7e4:1,i6g4:1,i7f4:1
6|6f6|b5e5:3,a1d4:1,a4d4:1
9|,b5e5|h8e5:1,i5f5:1,i8f5:1
7|g4|b5e5:2
9|,b5e5|i8g8:2
14|,i8g8|a1d4:1,b3e6:1
6|7f4|a1d4:2,a4d4:1,b5e5:1
9|,a1d4|i5f5:1,i8f5:1
6|8f5|b5e5:6,a1d4:5,a4d4:3,a2c2:1,d5d4:1
9|,a1d4|i9f6:3,i6f6:1,i7f4:1
14|,i9f6|b5e5:2,a3d6:1
19|,b5e5|h7e4:1,i7f4:1
11|4d4|g6f6:1,h7e4:1,i7f4:1
10|b5e5|i9f6:4,h7e4:1,i7f4:1
14|,i9f6|a4d4:3,a1d4:1
19|,a4d4|i7f4:2,h7e4:1
24|,i7f4|b4e4:2
29|,b4e4|h7e4:1,i6g4:1
6|9f6|a4d4:8,a1d4:7,b5e5:3
9|,a1d4|i8f5:3,i5f5:2,h8e5:1
14|,i5f5|b5e5:2
19|,b5e5|h4g4:1,i7f4:1
16|8f5|a3d6:1,b2e5:1,b5e5:1
11|4d4|i5f5:4,h8e5:3,i8f5:1
14|,h8e5|b3e6:1,b4e4:1,b5e5:1
15|i5f5|b5e5:3
19|,b5e5|h6e6:1,i6g4:1,i7f4:1
10|b5e5|h8e5:2,i8f5:1
14|,h8e5|b6b5:1,c5e5:1
0|b1c1|i7f4:1,i8f5:1
3|2|i5f5:2,i6f6:1,i9f6:1
4|,i5f5|a5d5:1,c2d2:1
1|6c6|i5f5:2,g7f7:1,h8f6:1
4|,i5f5|b1c2:1,c6d6:1
0|c3c4d4|i8f5:4,g7f6:2,g5f5:1,h8f6:1,i5f5:1,i6f6:1
6|,g7f6|b5e5:1
7|i8f5|b5e5:1
11|,b1b3c1|i6f6:1,i9f6:1
3|5d3|i5f5:3,i7f4:1
5|4|i5f5:6,i8f5:4,i9f6:4,i6f6:3,g6f6:1,g6g8:1
6|,i5f5|a1c3:1
11|,b1b3c2|h5e5:1,i9f6:1
13|2b4c3|i6f6:1,i9f6:1
8|6f6,b3b5c3|i5f5:2
18|,i5f5|b2e5:1
8|8f5,b3b5c3|i6f6:2
18|,i6f6|b2e5:2
23|,b2e5|h9g8:1,i7f7:1
8|9f6|b2c2:1
2|d3|i5f5:2,g7f6:1
4|,i5f5|a5d5:1,d3e4:1
1|5d5|i5f5:1,i8f5:1,i9f6:1
4|,g5g7f4|a1d4:2
11|,a1d4,h4h6g4|b2e5:2
23|,b2e5|i7g7:1`;
const OPENING_BOOK_BELGIAN_ENCODED = `0||a1d4:2229,i9f6:265,a2c4:25,i5f5:20,c2c4:13,a4c4:8,i8g6:5,h9f7:2,a5d5:2,a1c1:2,b3c4:2,c6c4:2
0|a1d4|i5f5:1656,a5d5:241,a2c4:110,a4c4:57,c6c4:52,c2c4:31,i6g6:15,i8g6:13,b2e5:9,i9f6:9,h4f4:7,g4g6:6,a5c7:4,i5g3:4,a4d7:2,b6d6:2
4|,a2c4|b3d5:36,i9f6:29,d6d4:10,c2c5:9,b2e5:6,b1d3:5,i9g9:4,h9f7:3,i5f5:2
9|,b3d5|c6f6:13,a4b5:8,b1d3:4,i5f5:3,i9f6:2
14|,a4b5|i8g6:2,b2e5:2
19|,b2e5|a5d5:2
20|i8g6|i6g6:2
15|b1d3|a4b5:3
15|c6f6|i9f6:6,i8g6:5,c4e6:2
19|,i8g6|i5f5:3
10|c2c5|a5c5:9
14|,a5c5|b3e6:6,b1c2:2
19|,b3e6|c7c4:4
10|d6d4|b1e4:3,b3d5:3,i9f6:2
14|,b1e4|i5f5:2
19|,i5f5|e4b1:2
24|,e4b1|i6g6:2
16|3d5|b1e4:2
15|i9f6|d5e5:2
10|i9f6|i8g6:19,d6d4:3,h8e5:2,b3d5:2
14|,b3d5|f4f6:2
15|d6d4|i8g6:2
15|i8g6|f4f6:7
6|4c4|a2c4:50,b2e5:4,i9f6:2
9|,a2c4|a5c7:20,b5e5:17,i6g6:3,b6d6:3,b3d5:3
14|,a5c7|b3d5:10,i9f6:6,b2e5:2
19|,b3d5|b5d5:7
24|,b5d5|d4f6:6
29|,d4f6|e6c4:2
20|i9f6|i6g6:3,b5e5:2
24|,b5e5|i8g6:2
25|i6g6|i8g6:3
29|,i8g6|h5e5:2
15|b3d5|d6f6:2
19|,d6f6|i9f6:2
24|,i9f6|i6g6:2
16|5e5|i9f6:6,b2e5:5,b3d5:3,c2c5:2
19|,b2e5|i8g6:2
16|6d6|c2c5:2
15|i6g6|c2c5:2
10|b2e5|b6b3:2,a5d5:2
14|,b6b3|b1d3:2
19|,b1d3|c6c3:2
6|5c7|i9f6:4
7|d5|a2c4:217,b2e5:13,i9f6:11
9|,a2c4|b5e5:136,b6c7:34,i5f5:28,b4d6:9,a4d7:3,i6g6:2,b6d6:2
14|,a4d7|c2c5:3
19|,c2c5|c7e7:2
15|b4d6|c2c5:4,b3d5:2,i9f6:2
19|,c2c5|b1b4:2
24|,b1b4|b5c6:2
16|5e5|i9f6:42,b3d5:41,b2e5:36,c2c5:7,b1b4:4,g8g6:2
19|,b1b4|b6d6:2
24|,b6d6|b3d5:2
21|2e5|i8g6:8,b4d6:7,c5e5:5,i5f5:5,g8g6:4,i6g6:3,b6c7:2
24|,b4d6|i8g6:6
29|,i8g6|b6e6:4
25|c5e5|i8g6:5
29|,i8g6|i5g3:2
25|i5f5|i8g6:5
29|,i8g6|h6f4:3
26|6g6|i8g6:3
29|,i8g6|i5g3:2
26|8g6|d7d4:4
21|3d5|i5f5:13,i9f6:6,b4d6:6,b2e5:4,c2c5:4,b1d3:2,i6g6:2
24|,b1d3|i5f5:2
26|2e5|i5f5:3
26|4d6|i9f6:3,b2e5:3
25|c2c5|i5f5:2
25|i5f5|i8g6:4,c4e6:3,b2e5:2
29|,c4e6|i6g6:3
30|i8g6|i6g6:4
26|6g6|i8g6:2
20|c2c5|b1b4:4,b3d5:2
24|,b1b4|b5c6:3
20|i9f6|g8g6:9,i5f5:7,i8g6:6,h9f7:3,c5f5:3,i6g6:3,b6d6:2,b4d6:2
24|,c5f5|i8g6:3
25|i5f5|i8g6:7
26|6g6|i8g6:3
16|6c7|i9f6:24,b1d3:2,b2e5:2,h9f7:2,b3d5:2
19|,b1d3|i5f5:2
24|,i5f5|d3d5:2
29|,d3d5|i6g6:2
21|2e5|i5f5:2
20|h9f7|i5f5:2
24|,i5f5|i8g6:2
29|,i8g6|i6g6:2
20|i9f6|i5f5:23
24|,i5f5|i8g6:18,h8e5:5
29|,h8e5|g4g6:3,i6g6:2
30|i8g6|h5e5:18
17|d6|c2c5:2
15|i5f5|c2c5:14,b2e5:11
19|,b2e5|i6g6:7,b4d6:3
24|,i6g6|c2c5:2,h4f4:2
20|c2c5|b3d5:4,i6g6:4,i9f6:2,g4g6:2
24|,b3d5|i6g6:3
25|i6g6|c3c6:4
29|,c3c6|h4f4:3
16|6g6|c2c5:2
10|b2e5|a4c4:8,b5e5:2
14|,a4c4|i9f6:4
10|i9f6|i5f5:5,a4c4:4,b5e5:2
14|,a4c4|b2e5:3
19|,b2e5|i5f5:2
24|,i5f5|i8g6:2
15|i5f5|h8e5:4
19|,h8e5|a4c4:2
24|,a4c4|i6g6:2
5|b2e5|d6d4:3,b3d3:2
9|,d6d4|b1e4:3
6|6d6|a2c4:2
5|c2c4|b5e5:10,a5c7:8,b1c2:7,a5c5:3,a4d7:2
9|,a4d7|b2e5:2
11|5c5|a2d5:3
14|,a2d5|b5d5:3
19|,b5d5|i9f6:3
13|7|a2d5:4,b1c2:2
14|,a2d5|c7c4:3
19|,c7c4|i9f6:3
24|,i9f6|b5d5:2
10|b1c2|a2d5:2,c5e5:2
14|,c5e5|b2e5:2
11|5e5|a2d5:5,i9f6:3
14|,a2d5|i5f5:2
6|6c4|a2c4:46,i9f6:4
9|,a2c4|i5f5:41,i6g6:3
14|,i5f5|c2c5:25,i9f6:8,i8g6:2,h5e5:2,b2e5:2
19|,b2e5|i6g6:2
20|c2c5|i6g6:25
24|,i6g6|i9g9:9,i9f6:6,b3d5:5,g5e5:2,b2e5:2
29|,b2e5|g4g7:2
31|3d5|g4g7:5
30|i9f6|h6f6:6
20|h5e5|f7f5:2
24|,f7f5|i6g6:2
20|i8g6|i6g6:2
24|,i6g6|h8e5:2
29|,h8e5|g4g7:2
21|9f6|i6g6:8
24|,i6g6|h8e5:6
29|,h8e5|g4g7:6
16|6g6|c2c5:3
19|,c2c5|i5f5:3
10|i9f6|a5d5:3
14|,a5d5|i8g6:3
19|,i8g6|a4d4:3
5|g4g6|a2c4:4,i8g6:2
9|,a2c4|h4g4:2
10|i8g6|i6g6:2
14|,i6g6|a2c4:2
5|h4f4|a2c4:6
9|,a2c4|i5f5:2,g8g6:2
14|,g8g6|c2c5:2
19|,c2c5|a5c5:2
5|i5f5|a2c4:1443,i9f6:75,b2e5:47,i6g6:31,i8g6:20,h5e5:17,b1d3:7,g4g6:4,h7f7:2,h9f7:2,i9g9:2
9|,a2c4|i6g6:1312,a5c7:47,h5e5:31,a5d5:24,b4d6:5,i9f6:5,i8g6:3,b2e5:3,g4g6:3,d6d4:2,g8g6:2,h4f4:2
14|,a5c7|b3d5:21,i9f6:9,b1d3:6,b2e5:4,i8g6:4,g4g6:2
19|,b1d3|i6g6:6
24|,i6g6|i9f6:3,h7f7:2
29|,i9f6|g4g7:3
21|2e5|i6g6:3
24|,i6g6|b3d5:2
21|3d5|b5d5:11,i6g6:6,d8d5:2
24|,b5d5|i9f6:3,g4g6:2,i9g9:2
29|,i9f6|i6g6:3
32|g9|i6g6:2
25|i6g6|b2e5:3,i9f6:2
29|,i9f6|g4g7:2
20|g4g6|h8e5:2
20|i8g6|i6g6:3
24|,i6g6|h8e5:3
29|,h8e5|g4g7:2
21|9f6|i6g6:9
24|,i6g6|h8e5:4
29|,h8e5|h6f6:2
17|d5|c2c5:16,b2e5:3,b3d5:2,i9f6:2
19|,b2e5|i6g6:3
24|,i6g6|c2c5:2
21|3d5|b5d5:2
20|c2c5|g4g6:5,b3d5:4,i6g6:2
24|,b3d5|a4c6:2
15|b4d6|c2c5:2
19|,c2c5|a5c5:2
15|g4g6|h8e5:2
19|,h8e5|d6d4:2
16|8g6|i8f5:2
15|h4f4|c2c5:2
19|,c2c5|a5c5:2
16|5e5|c2c5:14,b3d5:9,i8g6:2
19|,b3d5|b2e5:6
24|,b2e5|i6g6:6
20|c2c5|a5c5:5,i9f6:2,h9h6:2,g4g6:2
24|,a5c5|b3e6:2,h9h6:2
29|,b3e6|i6g6:2
30|h9h6|h4f4:2
25|h9h6|h4f4:2
20|i8g6|i6g6:2
15|i6g6|c2c5:600,b3d5:178,i9g9:127,b1d3:115,i9f6:103,b2e5:76,h7f7:37,h9f7:37,h5e5:10,g4g7:7,h6f6:5,i8f8:4,a4c4:3,a5d5:3,h4f4:2
19|,a4c4|h6f6:3
20|b1d3|g4g7:52,h4f4:19,h6f6:12,a5c7:10,a5d5:7,h5e5:7,b4d6:3
24|,a5c7|b3d5:8
29|,b3d5|h6f6:5
27|d5|c2c5:2,d3d5:2
29|,d3d5|b5d5:2
25|b4d6|b3d5:3
29|,b3d5|g4g7:2
25|g4g7|i9g7:50
29|,i9g7|h5e5:23,g5e5:18,h6e6:5,a5d5:2,g6i6:2
25|h4f4|c2e4:9,i9g9:4,d3d5:2
29|,c2e4|b4d6:5,a4d7:2
30|i9g9|a5c7:2,f4f6:2
26|5e5|b3d5:3
26|6f6|i9f6:7,i9g9:5
29|,i9f6|a5c7:2
32|g9|a5c7:3
21|2e5|g4g7:44,h6f6:13,a5d5:4,h5e5:3,a5c7:3,b6b3:2,h4f4:2
24|,a5c7|b3d5:2
27|d5|c2c5:2,b3d5:2
25|b6b3|b1d3:2
25|g4g7|i9g7:44
29|,i9g7|h5e5:35,h4g4:6,g5e5:2
25|h5e5|c2c5:3
26|6f6|b4d6:2,h5e5:2,i9g9:2,b3d5:2,g4g7:2
21|3d5|a5d5:100,g4g7:46,a5c7:27,h6f6:2
24|,a5c7|b2e5:16,i9f6:5,b1d3:2,i9g9:2,h5e5:2
29|,b2e5|h6f6:8,g4g7:3
30|i9f6|h5e5:4
32|g9|h6f6:2
27|d5|c2c5:19,i9f6:13,h4f4:11,i9g9:10,b1d3:10,g4g7:6,b4d6:5,h6f6:4,b6d6:2
29|,b1d3|b4d6:3
30|i9f6|b4d6:4,g4g7:2
32|g9|h6f6:4
25|g4g7|i9g7:40,c2c5:3,a5d5:2
29|,c2c5|g5g8:3
30|i9g7|h5e5:33,a5d5:5
20|c2c5|a5c5:406,h5e5:142,g4g7:46,b2e5:3
24|,a5c5|c3e5:291,b3e6:54,b1c2:30,b2e5:25,i9f6:2
29|,b1c2|h5e5:10,h6f6:8,b5d5:6,g4g7:2
31|2e5|c7c4:24
31|3e6|c7c4:18,g4g7:10,b5d5:9,h6f6:8,h5e5:7
30|c3e5|c7c4:172,h6f6:56,g4g7:34,h4f4:6,f5f6:2
30|i9f6|c7c4:2
25|g4g7|i9g7:26,c3c6:20
29|,c3c6|g5g8:17,a5c5:2
30|i9g7|a5c5:17,g5e5:8
25|h5e5|c3c6:105,i9g9:12,b3d5:10,b2e5:6,i9f6:3
29|,b2e5|a5c5:3,g4g7:3
31|3d5|h6f6:10
30|c3c6|h6f6:100,g4g7:3,g6i6:2
30|i9f6|g4g7:2
32|g9|h6f6:8
20|g4g7|f7f5:2,b2e5:2
20|h5e5|f7f5:3,h4f4:3
24|,f7f5|h4e4:3
21|6f6|f7d5:2
24|,f7d5|a5d5:2
21|7f7|g4g7:24,h6f6:5,a5d5:3,h4f4:3
24|,a5d5|c2c5:2
25|g4g7|i9g7:22,h9e6:2
29|,i9g7|h6e6:20
25|h6f6|i9f6:3
29|,i9f6|g4g7:2
21|9f7|g4g7:22,h6f6:7,h4f4:3,a5c7:2
24|,g4g7|i9g7:22
29|,i9g7|h4h7:20,h6e6:2
25|h4f4|i9f6:2
29|,i9f6|g4g7:2
26|6f6|i9f6:6
29|,i9f6|g4g7:2
20|i8f8|g4g7:4
24|,g4g7|i9g7:4
29|,i9g7|h6e6:4
21|9f6|g4g7:66,h5e5:21,h4f4:7,h6f6:5,a5c7:2,a5d5:2
24|,a5d5|b3d5:2
25|g4g7|h6f6:30,a5d5:15,a5c7:10,b4d6:3,c2c5:2
29|,c2c5|a5c5:2
25|h4f4|h8e5:4
29|,h8e5|f4f6:2,h5e5:2
26|5e5|b3d5:7,h7f7:5,c2c5:5
29|,b3d5|a5c7:3
30|c2c5|a5c5:5
30|h7f7|a5d5:2
26|6f6|h8f6:3
22|g9|h6f6:70,h4f4:13,a5d5:12,a5c7:11,b4d6:7,h5e5:7,b2e5:2,c2c5:2
24|,a5c7|b3d5:5,b2e5:2
29|,b3d5|b5d5:3
27|d5|c2c5:8
25|b4d6|b1d3:2
25|h4f4|h6f6:5,c2c5:2,b1d3:2
29|,b1d3|g4e4:2
30|c2c5|a5c5:2
26|5e5|c2c5:3,b3d5:2
29|,b3d5|a5c7:2
30|c2c5|a5c5:3
26|6f6|h8f6:47,b3d5:7,h4h6:5,b1d3:4,b2e5:3
29|,b1d3|a5c7:2,f6h6:2
31|2e5|a5d5:2
31|3d5|a5d5:5
30|h8f6|h4h6:36,a5d5:3
16|8g6|i6g6:3
19|,i6g6|b3d5:2
24|,b3d5|g4g7:2
16|9f6|i6g6:2,h5e5:2
10|b1d3|i6g6:4,b6b3:2
14|,i6g6|a2c4:3
19|,a2c4|g4g7:3
24|,g4g7|i9g7:2
11|2e5|i6g6:37,h5e5:4,b6b3:2
14|,h5e5|c3e5:3
19|,c3e5|i6g6:3
24|,i6g6|h6e6:3
15|i6g6|b6b3:6,i9f6:5,a2c4:5,h5e5:4,c3f6:3,h6f6:3,h4f4:2,c6c4:2,g4g7:2
19|,b6b3|b1d3:4
24|,b1d3|a4c4:4
20|c3f6|h6f6:2
20|h5e5|a2c4:2
21|6f6|f7d5:2
24|,f7d5|a4c4:2
20|i9f6|b6b3:3
24|,b6b3|b1d3:3
29|,b1d3|a4c4:2
10|g4g6|f7f5:2
14|,f7f5|i6f6:2
19|,i6f6|b2e5:2
24|,b2e5|h6e6:2
10|h5e5|f7f5:14
14|,f7f5|i6g6:8,h4e4:6
19|,h4e4|a2c4:5
24|,a2c4|i6g6:4
20|i6g6|a2c4:4,f6f4:3
24|,a2c4|h4e4:3
25|f6f4|h6f4:3
10|i6g6|f7f5:15,h6f6:5,i9g7:3,a2c4:2,a5d5:2
14|,a2c4|h5e5:2
15|f7f5|a5d5:6,h4e4:4,h5f5:4
19|,a5d5|b2e5:4,a2c4:2
24|,b2e5|a4c4:4
20|h4e4|a2c4:2
21|5f5|a2c4:3
24|,a2c4|h4e4:2
15|i9g7|h6f6:2
19|,h6f6|h8f6:2
11|8g6|i6g6:20
14|,i6g6|h8e5:12,i9g9:6
19|,h8e5|g4g7:3,a5c7:3
24|,a5c7|a2c4:3
25|g4g7|h4h7:3
20|i9g9|c2c4:2
24|,c2c4|h6f6:2
11|9f6|i6g6:70,a5d5:2,h5e5:2
14|,a5d5|a2c4:2
15|h5e5|i8g6:2
15|i6g6|h8e5:58,a2c4:6,h5e5:3,h9f7:2
19|,a2c4|h5e5:2
20|h5e5|f8f5:2
24|,f8f5|a4c4:2
21|8e5|a2c4:8,h4h7:8,a5d5:7,h6f6:6,a4c4:6,h5e5:5,g4g7:5,h4f4:5,c2c4:4,a5c7:3
24|,a4c4|a2c4:6
29|,a2c4|b4d6:3,a5c7:2
26|5d5|a2c4:7
29|,a2c4|h6f6:2
25|c2c4|a5c7:2
25|g4g7|h4h7:3
25|h4h7|h8f8:3,h9f7:3
29|,h8f8|g4g7:3
31|9f7|g4g7:3
26|5e5|a2c4:4
29|,a2c4|a5c7:2
26|6f6|a5d5:2,g6e6:2
21|9f7|g4g7:2
24|,g4g7|g8e6:2
29|,g8e6|h4h7:2
7|g3|a2c4:4
9|,a2c4|h4f4:2
14|,h4f4|c2c5:2
6|6g6|i8g6:13
9|,i8g6|h5e5:4,a5d5:2,i5g3:2,i5i6:2
14|,a5d5|a2c4:2
15|h5e5|a2c4:3
15|i5g3|a2c4:2
17|i6|g8g5:2
19|,g8g5|i6g6:2
24|,i6g6|a2c4:2
6|8g6|i6g6:7,a2c4:5
9|,i6g6|a2c4:6
14|,a2c4|f4f6:3
19|,f4f6|i9f6:3
24|,i9f6|h6f6:2
6|9f6|a2c4:2,h8e5:2,b2e5:2,i8g6:2
9|,h8e5|f4f6:2
14|,f4f6|h9e6:2
1|2c4|a4c4:24
4|,a4c4|a1c1:9,b2e5:5,i8g6:4,b3d3:3
9|,a1c1|i5f5:8
14|,i5f5|i8g6:4,g8g6:2
19|,g8g6|i6g6:2
24|,i6g6|h5e5:2
20|i8g6|i6g6:4
24|,i6g6|i9g9:3
29|,i9g9|h5e5:2
10|b2e5|i5f5:2,a5d5:2
11|3d3|c6c3:2
14|,c6c3|c2e4:2
19|,c2e4|i5f5:2
10|i8g6|i6g6:3
14|,i6g6|i9g9:2
19|,i9g9|c6c3:2
24|,c6c3|a5d5:2
1|4c4|i5f5:2
1|5d5|b5e5:2
4|,b5e5|d3d5:2
0|c2c4|a4c4:8,a5d5:2
4|,a4c4|a2c4:7
9|,a2c4|b4d6:2,b5e5:2,i5f5:2
14|,b5e5|b3d5:2
15|i5f5|b2e5:2
19|,b2e5|i6g6:2
0|h9f7|i5f5:2
0|i5f5|i6g6:11,h5e5:6,c1c4:2
4|,i6g6|h6f6:3,g4g7:2,a4c4:2
1|8g6|i6g6:5
4|,i6g6|h8e5:2
1|9f6|a5d5:182,i5f5:33,i8g6:19,a1d4:16,i6g6:7,a2c4:2,h8e5:2
4|,a1d4|f4f6:5,a2c4:4,h8e5:3,i8g6:2
9|,a2c4|i8g6:4
10|f4f6|i8g6:3,h9e6:2
14|,i8g6|a2c4:3
19|,a2c4|g5e5:2
6|5d5|i8g6:113,a1d4:47,c6c4:7,h8e5:7,a4c4:3,b1d3:2
9|,a1d4|a4c4:42,b5e5:4
14|,a4c4|b2e5:40
19|,b2e5|i6g6:10,b4d4:9,i5f5:7,b5e5:4,b6b3:4,i8g6:2,g8g6:2
24|,b4d4|b1c1:8
29|,b1c1|i6g6:3
26|5e5|i8g6:4
29|,i8g6|c6c3:2
26|6b3|b1c1:3
25|i5f5|i8g6:6
29|,i8g6|b4d4:2
26|6g6|i8g6:10
29|,i8g6|b4d4:3,i5g3:3
15|b5e5|a2c4:4
19|,a2c4|i8g6:2
10|b1d3|a4c4:2
10|c6c4|i8g6:6
14|,i8g6|a4d4:2,b6b3:2
19|,a4d4|b1d3:2
20|b6b3|b1d3:2
10|h8e5|a4c4:3,b5e5:3
14|,a4c4|a1d4:2
15|b5e5|i8g6:2
19|,i8g6|a4c4:2
24|,a4c4|b3d3:2
29|,b3d3|c6c3:2
10|i8g6|a4c4:99,i5g3:8,i5f5:4
14|,a4c4|g8g5:68,h9f7:5,a1c1:5,a1d4:4,h8e5:4,b4d4:3,i6g6:2,b3d3:2,i5f5:2
19|,a1c1|i5g3:3,b4d4:2
22|d4|c6c3:2
20|b4d4|d3f5:2
20|g8g5|i5g5:62,c6c3:5
24|,c6c3|a1c3:3,g7g4:2
29|,a1c3|c5e5:3
30|g7g4|c5c2:2
25|i5g5|h9g8:52,g7e5:7,h8e5:2
29|,g7e5|g3g6:4
30|h8e5|g3g6:2
31|9g8|b4d4:18,b5e5:10,h5f5:10,c6c3:7,h4h7:3,b4d6:2
20|h8e5|i5g3:2
21|9f7|c6c3:3
24|,c6c3|a1c3:3
20|i6g6|g4g7:2
15|i5f5|g8g5:3
19|,g8g5|a1d4:2
17|g3|h7f5:6
19|,h7f5|h5f5:4,a4c4:2
24|,h5f5|h9h7:4
29|,h9h7|h4f4:2,h6f4:2
5|h8e5|g7d4:2
5|i5f5|i8g6:31
9|,i8g6|h5e5:14,h4f4:8,a5d5:6
14|,a5d5|g8g5:5
19|,g8g5|h7f5:4
24|,h7f5|i6g4:3
15|h4f4|g8g5:8
19|,g8g5|g3f3:4,g4e4:3
24|,g3f3|a1d4:3
29|,a1d4|f3f6:2
26|4e4|a1d4:3
16|5e5|g8g5:7,h8e5:5
19|,g8g5|h9h6:4,e5g5:2
24|,e5g5|h9g8:2
29|,h9g8|a5d5:2
25|h9h6|h5g4:3
20|h8e5|g5e5:3
24|,g5e5|a2c4:3
6|6g6|i8g6:7
9|,i8g6|h5e5:3,i5g3:3
14|,i5g3|a1d4:2
6|8g6|a1d4:10,f4f6:3,i5g5:3,h7f5:2
9|,a1d4|a2c4:4,f4f6:4
14|,f4f6|h7f5:2,a2c4:2
10|f4f6|h8f6:3
10|h7f5|i6h5:2
14|,i6h5|h8e5:2
19|,h8e5|i5f5:2
10|i5g5|h7f5:3
14|,h7f5|h5f5:3
19|,h5f5|a1d4:3`;
const OPENING_BOOK_GERMAN_ENCODED = `0||c1e3:61,g9e7:19,b1e4:14,h9e6:7,b2d4:3,d2d4:3,c3e3:2,h5f5:2,h8f6:2
0|b1e4|g3e3:4,g5e3:3,h4e4:3,b6e6:2,c7e7:2
4|,b6e6|h9e6:2
5|c7e7|g9g6:2
5|g3e3|d2d4:3
9|,d2d4|b5d5:2
1|2d4|c7e7:3
4|,c7e7|f8f6:2
0|c1e3|f3f5:32,g3g6:18,c7e7:7,h4e4:2
4|,c7e7|c3f3:2,f8f6:2,g9g6:2
9|,c3f3|g3g6:2
10|f8f6|f3f5:2
5|f3f5|g9e7:13,h8f6:11,b1e4:3,h5e5:2,h9e6:2
9|,b1e4|h4e4:3
14|,h4e4|b2e5:2
19|,b2e5|g4d4:2
24|,g4d4|d2d4:2
29|,d2d4|d7d4:2
10|g9e7|d7d5:9,c7c4:4
14|,c7c4|h8f6:2
15|d7d5|b2d4:4,h8f6:3,h9e6:2
19|,b2d4|b6e6:2,c7c4:2
10|h8f6|g3f3:4,g3g6:3,c7e7:2,h4e4:2
14|,c7e7|f8f5:2
19|,f8f5|g3g6:2
15|g3f3|b1c1:2
17|g6|h9e6:2
15|h4e4|f8f5:2
19|,f8f5|h5f5:2
24|,h5f5|c3f3:2
29|,c3f3|g3g6:2
5|g3g6|g9e7:10,h8f6:5,h9e6:2
9|,g9e7|c7c4:7,d7d5:2
14|,c7c4|b2d4:3
19|,b2d4|b5d5:2
15|d7d5|h8f6:2
10|h8f6|g6f5:2
5|h4e4|c3f3:2
9|,c3f3|g3g6:2
14|,g3g6|g9e7:2
19|,g9e7|c7c4:2
24|,c7c4|f3c3:2
29|,f3c3|h5f5:2
0|g9e7|d7d5:9,c7c4:6,g3e3:4
4|,c7c4|c1e3:3
9|,c1e3|f3f5:2
14|,f3f5|h8f6:2
5|d7d5|b2d4:4,b1e4:2,c1e3:2
5|g3e3|d2d4:2
0|h5f5|h4e4:2
1|9e6|c7e7:2,g3e3:2
4|,g3e3|d2d4:2`;
// Decodage front-coding : chaque ligne = (longueur du prefixe partage avec la
// cle precedente | suffixe | coups "label:freq" separes par des virgules).
// Reduit le bloc 'standard' de 23 7 Ko a 5,3 Ko de texte source (77,6%), en
// exploitant que les cles s'etendent les unes les autres par construction
// (\'a1d4\' -> \'a1d4,i5f5\' -> ...). Purement synchrone, aucune dependance a
// DecompressionStream : le book doit etre pret immediatement pour le tout
// premier coup de l'IA, pas charge en differe comme les banques de parties.
// Verifie par aller-retour strict contre les 223 entrees d'origine avant
// integration (0 divergence).
function _decodeFrontCodedBook(text) {
  const out = {};
  let prev = '';
  const lines = text.split('\n');
  for (const line of lines) {
    if (!line) continue;
    const i1 = line.indexOf('|');
    const i2 = line.indexOf('|', i1+1);
    const prefixLen = parseInt(line.slice(0, i1), 10);
    const suffix = line.slice(i1+1, i2);
    const movesStr = line.slice(i2+1);
    const key = prev.slice(0, prefixLen) + suffix;
    const moves = movesStr ? movesStr.split(',').map(function(m){
      const ci = m.indexOf(':');
      const label = m.slice(0, ci);
      const freq = parseInt(m.slice(ci+1), 10);
      return { from: label.slice(0,2), to: label.slice(2,4), freq: freq };
    }) : [];
    out[key] = { moves: moves };
    prev = key;
  }
  return out;
}
const OPENING_BOOK = {
  'standard': _decodeFrontCodedBook(OPENING_BOOK_STD_ENCODED),
  'belgian': _decodeFrontCodedBook(OPENING_BOOK_BELGIAN_ENCODED),
  'german': _decodeFrontCodedBook(OPENING_BOOK_GERMAN_ENCODED)
};

// Reconstruit la clé (style livre) à partir de l'historique des coups joués
function openingKeyFromHistory() {
  const parts = [];
  for (let i = 0; i < boardSnapshots.length; i++) {
    const snap = boardSnapshots[i];
    if (snap && snap.moveInfo && snap.moveInfo.cells && snap.moveInfo.dir) {
      const lbl = moveToPlayStrategy(snap.moveInfo.cells, snap.moveInfo.dir, snap.moveInfo.type);
      if (!lbl) return null;     // coup non étiquetable (flèche) → on sort du livre
      parts.push(lbl);
    } else if (snap && snap.label) {
      parts.push(String(snap.label).replace(/[^a-i0-9]/g, ''));
    }
  }
  return parts.join(',');
}

// Renvoie un coup d'ouverture LÉGAL (ou null). legalMoves : liste déjà générée (optionnel).
function getOpeningMove(aiCol, legalMoves) {
  try {
    const layout = (typeof currentLayout !== 'undefined' && currentLayout) ? currentLayout : 'standard';
    const book = OPENING_BOOK[layout] || OPENING_BOOK['standard'];
    if (!book) return null;
    const key = openingKeyFromHistory();
    if (key === null) return null;
    let entry = book[key];
    if (!entry || !entry.moves || !entry.moves.length) {
      // Repli sur le book issu du Labo (parties reelles jouees par le moteur
      // lui-meme) UNIQUEMENT si le book historique n'a rien pour cette
      // position — jamais fusionne aux frequences historiques, jamais
      // prioritaire sur elles (voir _labMineBook).
      try {
        const labBook = JSON.parse(localStorage.getItem(LAB_BOOK_KEY) || '{}');
        const labEntry = labBook[layout] && labBook[layout][key];
        if (labEntry && labEntry) entry = { moves: Object.keys(labEntry).map(function(lbl){
          return { from: lbl.slice(0,2), to: lbl.slice(2,4), freq: labEntry[lbl] };
        }) };
      } catch(e) {}
      if (!entry || !entry.moves || !entry.moves.length) return null;
    }
    // Index des coups légaux par étiquette style-livre
    const legal = legalMoves || getAllMovesForColor(aiCol);
    const byLabel = {};
    for (const mv of legal) {
      const l = moveToPlayStrategy(mv.cells, mv.dir, mv.type).toLowerCase();
      if (l && !(l in byLabel)) byLabel[l] = mv;
    }
    // Candidats du livre RÉSOLVABLES en coup légal, choisis par fréquence (avec variété)
    const resolvable = [];
    for (const t of entry.moves) {
      const want = (t.from + t.to).toLowerCase();
      if (byLabel[want]) resolvable.push({ mv: byLabel[want], freq: t.freq || 1 });
    }
    if (!resolvable.length) return null;
    let total = 0; for (const x of resolvable) total += x.freq;
    let r = Math.random() * total;
    for (const x of resolvable) { r -= x.freq; if (r <= 0) return x.mv; }
    return resolvable[0].mv;
  } catch (e) {
    console.warn('getOpeningMove ignoré (erreur):', e);
    return null;   // jamais bloquant pour l'IA
  }
}


/* ═══════════════════════════════════════════
   PROFILAGE ADVERSE (V13) — L'IA adapte son style au tien
   Réutilise styleGame + computeStyleProfile (profil de TES coups).
   Ne touche que l'éval du WORKER (la page reste à poids fixes,
   pour que le coach et l'analyse de style restent stables).
═══════════════════════════════════════════ */
/* ═══════════════════════════════════════════
   MOTEUR EXPERIMENTAL NNUE — options selectionnables dans Parametres
   avances, honnetement etiquetees "experimental / plus faible" : sur 15
   parties equitables (positions reelles variees, biais du premier coup
   controle) contre le moteur actuel (6-8 poids regles a la main + SPSA),
   le mode evaluation-NNUE gagne 2, perd 8, fait nulle 5 fois. Le mode
   ordonnancement-NNUE ajoute +2.7% de noeuds explores a resultat egal
   (pire, pas mieux). Le mode combine des deux donne un resultat quasi
   identique au premier (2V/8D/5N). Petit reseau (125->32->16->1, 4577
   parametres) entraine sur 189797 positions extraites des 3944 vraies
   parties rejouables du corpus (MIGS+AbalOnline), avec decoupage
   entrainement/validation PAR PARTIE (pas par position, pour eviter toute
   fuite entre positions correlees de la meme partie) -- 80.3% de precision
   du signe sur des parties jamais vues, mais predire qui gagne une partie
   humaine est un objectif different de bien evaluer une position pour la
   recherche. Propose comme curiosite/transparence, pas comme amelioration
   -- conserve tel quel, l'IA par defaut reste le moteur existant. */
const NNUE_B64='
// Function that evaluates the board based on the counting points heuristic
function evalCount(board, player) {
  let score = 0;
  for (let i = 0; i < board.length; i++) {
    for (let j = 0; j < board[i].length; j++) {
      if (board[i][j] === player) {
        // Add one point if the ball belongs to the player
        score++;
        // Check if the ball is close to the edge of the board
        if (i < 3 || i > 11 || j < 3 || j > 11) {
          score++;
        }
      }
    }
  }
  return score;
}

// Function that evaluates the board based on the distance heuristic
function evalDistance(board, player) {
  let score = 0;
  const goalRow = (player === 'W') ? 0 : 14;
  for (let i = 0; i < board.length; i++) {
    for (let j = 0; j < board[i].length; j++) {
      if (board[i][j] === player) {
        // Add the distance to the final goal
        score += Math.abs(goalRow - i);
      }
    }
  }
  return score;
}

// Function that evaluates the board based on the force heuristic
function evalForce(board, player) {
  let score = 0;
  const opp = (player === 'W') ? 'B' : 'W';
  for (let i = 0; i < board.length; i++) {
    for (let j = 0; j < board[i].length; j++) {
      if (board[i][j] === player) {
        // Add the number of neighboring friendly balls
        score += countNeighbors(board, i, j, player);
        // Subtract the number of neighboring enemy balls
        score -= countNeighbors(board, i, j, opp);
      }
    }
  }
  return score;
}

// Function that counts the number of neighboring balls of a certain color
function countNeighbors(board, row, col, color) {
  let count = 0;
  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      if (i === 0 && j === 0) {
        continue;
      }
      const r = row + i;
      const c = col + j;
      if (r < 0 || r >= board.length || c < 0 || c >= board[r].length) {
        continue;
      }
      if (board[r][c] === color) {
        count++;
      }
    }
  }
  return count;
}

// Function that returns the best move to play using the Minimax algorithm
function minimax(board, depth, player, evalFunc, maxPlayer) {
  if (depth === 0) {
    return { score: evalFunc(board, maxPlayer), move: null };
  }
  const opp = (player === 'W') ? 'B' : 'W';
  const moves = generateMoves(board, player);
  if (moves.length === 0) {
    return { score: evalFunc(board, maxPlayer), move: null };
  }
  let bestScore = (player === maxPlayer) ? -Infinity : Infinity;
  let bestMove = null;
  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];
    const newBoard = applyMove(board, move);
const score = minimax(newBoard, depth - 1, opp, evalFunc, maxPlayer).score;
if (player === maxPlayer) {
if (score > bestScore) {
bestScore = score;
bestMove = move;
}
} else {
if (score < bestScore) {
bestScore = score;
bestMove = move;
}
}
}
return { score: bestScore, move: bestMove };
}
    
    // Function that generates all possible moves for a given player on a given board
function generateMoves(board, player) {
const moves = [];
for (let i = 0; i < board.length; i++) {
for (let j = 0; j < board[i].length; j++) {
if (board[i][j] === player) {
// Check all possible moves for this ball
const possibleMoves = getValidMoves(board, i, j);
for (const move of possibleMoves) {
moves.push({ from: [i, j], to: move });
}
}
}
}
return moves;
}

// Function that gets all valid moves for a ball on the given board at the given position
function getValidMoves(board, row, col) {
const moves = [];
for (let i = -1; i <= 1; i++) {
for (let j = -1; j <= 1; j++) {
if (i === 0 && j === 0) {
continue;
}
let r = row + i;
let c = col + j;
let emptyCount = 0;
while (r >= 0 && r < board.length && c >= 0 && c < board[r].length && board[r][c] === null) {
// Count number of empty spaces in this direction
emptyCount++;
r += i;
c += j;
}
if (emptyCount > 0) {
// Add move to the list of possible moves
moves.push([r - i, c - j]);
}
}
}
return moves;
}

// Heuristic function based on counting the number of balls on the board
function evalCount(board, player) {
let score = 0;
for (let i = 0; i < board.length; i++) {
for (let j = 0; j < board[i].length; j++) {
if (board[i][j] === player) {
// Add one point if the ball belongs to the player
score++;
// Check if the ball is close to the edge of the board
if (i < 3 || i > 11 || j < 3 || j > 11) {
score++;
}
}
}
}
return score;
}

// Heuristic function based on measuring the distance between the balls and the final goal
function evalDistance(board, player) {
let score = 0;
const goalRow = (player === 'W') ? 0 : 14;
for (let i = 0; i < board.length; i++) {
for (let j = 0; j < board[i].length; j++) {
if (board[i][j] === player) {
// Add the distance to the final goal
score += Math.abs(goalRow - i);
}
}
}
return score;
}

// Heuristic function based on measuring the relative strength of the balls
function evalForce(board, player) {
let score = 0;
const opp = (player === 'W') ? 'B' : 'W';
for (let i = 0; i < board.length; i++) {
for (let j = 0; j < board[i].length; j++) {
if (board[i][j] === player) {
// Add the number of friendly neighbor balls
score += countNeighbors(board, i, j, player

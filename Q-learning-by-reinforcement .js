// Define the environment
const environment = {
  states: {
    blackPositions: ['a1', 'a2', 'b1', 'b2', 'b3', 'c2', 'c3', 'g7', 'g8', 'h7', 'h8', 'h9', 'i8', 'i9'],
    whitePositions: ['a4', 'a5', 'b4', 'b5', 'b6', 'c5', 'c6', 'g4', 'g5', 'h4', 'h5', 'h6', 'i5', 'i6'],
    allPositions: [
      ['i5', 'i6', 'i7', 'i8', 'i9'],
      ['h4', 'h5', 'h6', 'h7', 'h8', 'h9'],
      ['g3', 'g4', 'g5', 'g6', 'g7', 'g8', 'g9'],
      ['f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9'],
      ['e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7', 'e8', 'e9'],
      ['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8'],
      ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7'],
      ['b1', 'b2', 'b3', 'b4', 'b5', 'b6'],
      ['a1', 'a2', 'a3', 'a4', 'a5']
    ]
  },

   state: {
    black: ['a1', 'a2', 'b1', 'b2', 'b3', 'c2', 'c3', 'g7', 'g8', 'h7', 'h8', 'h9', 'i8', 'i9'],
    white: ['a4', 'a5', 'b4', 'b5', 'b6', 'c5', 'c6', 'g4', 'g5', 'h4', 'h5', 'h6', 'i5', 'i6']
  },

  actions: ['move', 'push'],  // all possible actions the agent can take
  rewards: [[0, 1], [-1, 0]],  // reward matrix (state x action)
  transition: [[1, 0], [0, 2], [1, 2]],  // transition matrix (state x action)
 
 function randomMove() {
  // Chooses a random direction
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const direction = directions[Math.floor(Math.random() * directions.length)];

  // Returns the corresponding move string
  return "m " + direction;
}

function randomPush() {
  // Chooses a random direction
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const direction = directions[Math.floor(Math.random() * directions.length)];

  // Returns the corresponding push string
  return "p " + direction;
}

function applyPush(state, direction) {
  // Get the player's current position and the position in front of the player
  const player_pos = state.position;
  let [player_x, player_y] = player_pos.split('');
  player_y = parseInt(player_y);
  let [box_x, box_y] = player_pos.split('');
  box_y = parseInt(box_y);

  if (direction === 'N') {
    box_y -= 1;
  } else if (direction === 'NE') {
    box_x = String.fromCharCode(box_x.charCodeAt(0) + 1);
    box_y -= 1;
  } else if (direction === 'E') {
    box_x = String.fromCharCode(box_x.charCodeAt(0) + 1);
  } else if (direction === 'SE') {
    box_x = String.fromCharCode(box_x.charCodeAt(0) + 1);
    box_y += 1;
  } else if (direction === 'S') {
    box_y += 1;
  } else if (direction === 'SW') {
    box_x = String.fromCharCode(box_x.charCodeAt(0) - 1);
    box_y += 1;
  } else if (direction === 'W') {
    box_x = String.fromCharCode(box_x.charCodeAt(0) - 1);
  } else if (direction === 'NW') {
    box_x = String.fromCharCode(box_x.charCodeAt(0) - 1);
    box_y -= 1;
  }

  // If there is no box in front of the player, return the original state
  if (!state.boxes.includes(box_x + box_y)) {
    return state;
  }

  // Get the new position of the box in the direction of the push
  let new_box_x, new_box_y;
  if (direction === 'N') {
    new_box_x = box_x;
    new_box_y = box_y - 1;
  } else if (direction === 'NE') {
    new_box_x = String.fromCharCode(box_x.charCodeAt(0) + 1);
    new_box_y = box_y - 1;
  } else if (direction === 'E') {
    new_box_x = String.fromCharCode(box_x.charCodeAt(0) + 1);
    new_box_y = box_y;
  } else if (direction === 'SE') {
    new_box_x = String.fromCharCode(box_x.charCodeAt(0) + 1);
    new_box_y = box_y + 1;
  } else if (direction === 'S') {
    new_box_x = box_x;
    new_box_y = box_y + 1;
  } else if (direction === 'SW') {
    new_box_x = String.fromCharCode(box_x.charCodeAt(0) - 1);
    new_box_y = box_y + 1;
  } else if (direction === 'W') {
    new_box_x = String.fromCharCode(box_x.charCodeAt(0) - 1);
    new_box_y = box_y;
  } else if (direction === 'NW') {
    new_box_x = String.fromCharCode(box_x.charCodeAt(0) - 1);
    new_box_y = box_y - 1;
  }

  // If the box can't be pushed in the direction of the push, return the original state
  if (state.boxes.includes(new_box_x + new_box_y) || state.walls.includes(new_box_x + new_box_y)) {
    return state;
  }

  // Update the state with the new positions of the player and the box
  let new_boxes = state.boxes.filter(pos => pos !== box_x + box


  isGameOver: function (state) {
    if (state.black.length === 0) {
      console.log("Black player wins!");
      return true;
    } else if (state.white.length === 0) {
      console.log("White player wins!");
      return true;
    }
    return false;
  },

  // reward function, takes in the previous state, the current state, and the action
  rewardFunction: function (prevState, currentState, action) {
    let isPush = (action === 'push');
    let isMove = (action === 'move');
    let reward = 0;

    // check if any pieces were removed
    if (isPush && prevState.white.length > currentState.white.length) {
      reward = 1;
    } else if (isPush && prevState.black.length > currentState.black.length) {
      reward = -1;
    }

    // check if time has run out
    if (currentState.time <= 0) {
      if (currentState.currentPlayer === 'black') {
        console.log("White player wins!");
        reward = -10;
      } else {
        console.log("Black player wins!");
        reward = 10;
      }
    }

    return reward;
  }
};

// Initialize the Q table with zeros
let Q = {};
for (let i = 0; i < environment.states.length; i++) {
  Q[environment.states[i]] = {};
  for (let j = 0; j < environment.actions.length; j++) {
    Q[environment.states[i]][environment.actions[j]] = 0;
  }
}

// Train the agent using Q-Learning
const alpha = 0.5;  // learning rate
const gamma = 0.9;  // discount factor
const epsilon = 0.1;  // exploration rate

const train = (numEpisodes) => {
  for (let i = 0; i < numEpisodes; i++) {
    let s = environment.state;
    let done = false;
    while (!done) {
      // Choose the next action to take using an epsilon-greedy policy
      let a;
      if (Math.random() < epsilon) {
        // Explore
        a = environment.actions[Math.floor(Math.random() * environment.actions.length)];
      } else {
        // Exploit
        let bestAction = Math.max(...Object.keys(Q[s]).map(a => Q[s][a]));
        let bestActions = Object.keys(Q[s]).filter(a => Q[s][a] === bestAction);
        a = bestActions[Math.floor(Math.random() * bestActions.length)];
      }

      // Take the chosen action and observe the reward and new state
      let [reward, newState] = [environment.rewards[0][a], s]; // reward is always 0 for the game of Abalone
      
      if (a === 'move') {
        // Apply a random move
        let [i, j] = randomMove(s);
        newState = applyMove(s, i, j);
      } else if (a === 'push') {
        // Apply a random push
        let [i, j, k] = randomPush(s);
        newState = applyPush(s, i, j, k);
      }

      // Update the Q table using the Bellman equation
      let bestQ = Math.max(...Object.keys(Q[newState]).map(a => Q[newState][a]));
      Q[s][a] += alpha * (reward + gamma * bestQ - Q[s][a]);

      // Update the current state
      s = newState;

      // Check if we have reached a terminal state
      done = (s === environment.states[environment.states.length - 1]);
    }
  }
}

// Use the trained agent to make decisions
const test = () => {
  let s = environment.state;
  let done = false;
  while (!done) {
    // Choose the action with the highest Q value
    let bestAction = Math.max(...Object.keys(Q[s]).map(a => Q[s][a]));
    let bestActions = Object.keys(Q[s]).filter(a => Q[s][a] === bestAction);
    let a = bestActions[0];

    // Take the chosen action and observe the reward and new state
    let [reward, newState] = [environment.rewards[s][a], environment.transition[s][a]];

    // Update the current state
    s = newState;

    // Check if we have reached a terminal state
    done = (s === environment.states[environment.states.length - 1]);

    // Print the result
    console.log(`State: ${s}, Action: ${a}, Reward: ${reward}`);
  }
}

// Train the agent for 1000 games
const train = (numGames) => {
  for (let i = 0; i < numGames; i++) {
    let s = environment.reset();
    let done = false;
    while (!done) {
      // Choose an action
      let a = agent.act(s);

      // Take the chosen action and observe the reward and new state
      let [reward, newState] = environment.step(s, a);

      // Update the agent with the new state and reward
      agent.learn(s, a, reward, newState);

      // Update the current state
      s = newState;

      // Check if we have reached a terminal state
      done = environment.isDone();

      // Print the result
      console.log(`State: ${s}, Action: ${a}, Reward: ${reward}`);
    }
  }
}

// Use the trained agent to make decisions
const test = () => {
  let s = environment.reset();
  let done = false;
  while (!done) {
    // Choose the action with the highest Q value
    let a = agent.act(s);

    // Take the chosen action and observe the reward and new state
    let [reward, newState] = environment.step(s, a);

    // Update the current state
    s = newState;

    // Check if we have reached a terminal state
    done = environment.isDone();

    // Print the result
    console.log(`State: ${s}, Action: ${a}, Reward: ${reward}`);
  }
 }
};

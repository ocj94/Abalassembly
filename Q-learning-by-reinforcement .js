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



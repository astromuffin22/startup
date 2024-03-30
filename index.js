const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const uuid = require('uuid');
const WebSocket = require('ws');
require('dotenv').config();

const app = express();
const port = 4000;

mongoose.connect("mongodb+srv://astromuffin22:astromuffin22@cluster0.1c0kdgj.mongodb.net/case_central", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  lastLogin: { type: Date, default: Date.now },
  token: { type: String, unique: true },
});

const User = mongoose.model('User', userSchema);

let scoresData = [];
let totalCasesOpened = 1437;

app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.static('public'));

app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists!' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashedPassword, token: uuid.v4()});

    await user.save();
    res.json({ message: 'Registration successful!', token: user.token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
  
    try {
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
  
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      console.log(user)
    //   Check passing in token, user might not have all atts like that
      res.json({ message: 'Logged in!', token: user.token});
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'ERROR' });
    }
});

app.post('/api/authenticate', async (req, res) => {
    const { token } = req.body;
  
    try {
        // see if passing in token will work or if User.findOne needs to be configured to accept token as an arg
      const user = await User.findOne({ token });
      if (!user) {
        return res.status(401).json({ message: 'No user found' });
      }

      res.json({ message: 'User found!'});
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'ERROR' });
    }
});

const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', function connection(ws) {
  ws.on('message', function incoming(message) {
    const data = JSON.parse(message);
    switch(data.type) {
      case 'spin':
        console.log('Spin data received:', data);
        break;
      case 'counter':
        totalCasesOpened = data.totalCasesOpened;
        console.log('Counter data received:', data);
        broadcastCounter();
        break;
      default:
        console.log('Unknown message type:', data.type);
    }
  });
});

function broadcastCounter() {
  const counterData = { type: 'counter', totalCasesOpened };
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(counterData));
    }
  });
}

app.post('/api/addScore', (req, res) => {
    const data = req.body;
    scoresData.push(data);
    res.json({ message: 'Score added successfully!', scores: scoresData });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const Filter = require('bad-words');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
const say = require('say');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3007;
app.use(express.static('public'));

const apiKey = '';
const genAI = new GoogleGenerativeAI(apiKey);

const model = genAI.getGenerativeModel({
  model: 'gemini-1.5-flash-latest',
});

const generationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 64,
  maxOutputTokens: 8192,
  responseMimeType: 'text/plain',
};

const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

app.use(bodyParser.json());
app.use(cors());

const filter = new Filter();

app.post('/chat', async (req, res) => {
  const { message, history } = req.body;

  if (filter.isProfane(message)) {
    return res.status(400).json({ error: 'Inappropriate language detected. Please try again with appropriate language.' });
  }

  const chatSession = model.startChat({
    generationConfig,
    safetySettings,
    history: history,
  });

  const result = await chatSession.sendMessage(message);
  const responseText = result.response.text();

  // Generate audio from the response text using say module
  const audioFileName = `output${Date.now()}.wav`;
  const audioFilePath = path.join(__dirname, 'public', audioFileName);

  say.export(responseText, null, 1.0, audioFilePath, (err) => {
    if (err) {
      console.error('Error:', err);
      return res.status(500).json({ error: 'Failed to generate audio.' });
    }

    res.json({ text: responseText, audioPath: audioFileName });
  });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

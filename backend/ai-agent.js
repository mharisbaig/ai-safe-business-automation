
const axios = require("axios");

async function askAI(prompt) {

  const response = await axios.post(
    "https://api.anthropic.com/v1/messages",
    {
      model: "claude-3-haiku-20240307",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    },
    {
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      }
    }
  );

  return response.data;

}

module.exports = { askAI };

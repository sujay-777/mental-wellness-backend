const { NlpManager } = require('node-nlp');

class Chatbot {
  constructor() {
    this.manager = new NlpManager({ languages: ['en'], forceNER: true });
    this._train();
  }

  async _train() {
    // Greetings
    this.manager.addDocument('en', 'hello', 'greeting');
    this.manager.addDocument('en', 'hi', 'greeting');
    this.manager.addDocument('en', 'hey', 'greeting');
    this.manager.addDocument('en', 'howdy', 'greeting');
    this.manager.addAnswer('en', 'greeting', 'Hello! How can I help you today?');
    this.manager.addAnswer('en', 'greeting', 'Hi there! How are you feeling?');
    this.manager.addAnswer('en', 'greeting', "Welcome! I'm here to listen and support you.");

    // Anxiety
    this.manager.addDocument('en', 'I feel anxious', 'anxiety');
    this.manager.addDocument('en', 'I have anxiety', 'anxiety');
    this.manager.addDocument('en', 'worried', 'anxiety');
    this.manager.addDocument('en', 'nervous', 'anxiety');
    this.manager.addDocument('en', 'panic', 'anxiety');
    this.manager.addAnswer('en', 'anxiety', "I understand you're feeling anxious. Would you like to try a quick breathing exercise?");
    this.manager.addAnswer('en', 'anxiety', "It's okay to feel anxious. Let's take a moment to breathe together.");
    this.manager.addAnswer('en', 'anxiety', "Would you like to talk about what's making you feel anxious?");

    // Stress
    this.manager.addDocument('en', 'I am stressed', 'stress');
    this.manager.addDocument('en', 'overwhelmed', 'stress');
    this.manager.addDocument('en', 'pressure', 'stress');
    this.manager.addDocument('en', 'tension', 'stress');
    this.manager.addAnswer('en', 'stress', 'Stress can be challenging. Would you like to try a quick stress-relief technique?');
    this.manager.addAnswer('en', 'stress', "Let's take a moment to identify what's causing your stress.");
    this.manager.addAnswer('en', 'stress', 'Remember to take deep breaths. Would you like to try a guided relaxation exercise?');

    // Depression
    this.manager.addDocument('en', 'I feel depressed', 'depression');
    this.manager.addDocument('en', 'sad', 'depression');
    this.manager.addDocument('en', 'down', 'depression');
    this.manager.addDocument('en', 'hopeless', 'depression');
    this.manager.addDocument('en', 'empty', 'depression');
    this.manager.addAnswer('en', 'depression', "I'm here to listen and support you. Would you like to talk about what you're feeling?");
    this.manager.addAnswer('en', 'depression', "It's important to acknowledge these feelings. Would you like to speak with a therapist?");
    this.manager.addAnswer('en', 'depression', "Remember that you're not alone. Would you like to try some coping strategies?");

    // Sleep
    this.manager.addDocument('en', "can't sleep", 'sleep');
    this.manager.addDocument('en', 'insomnia', 'sleep');
    this.manager.addDocument('en', 'tired', 'sleep');
    this.manager.addDocument('en', 'exhausted', 'sleep');
    this.manager.addDocument('en', 'sleep problems', 'sleep');
    this.manager.addAnswer('en', 'sleep', 'Sleep issues can be challenging. Would you like to try some sleep hygiene tips?');
    this.manager.addAnswer('en', 'sleep', 'Let\'s explore what might be affecting your sleep.');
    this.manager.addAnswer('en', 'sleep', 'Would you like to try a guided relaxation exercise before bed?');

    // General fallback
    this.manager.addAnswer('en', 'None', "I'm here to listen. Would you like to tell me more about how you're feeling?");

    await this.manager.train();
    this.manager.save();
  }

  async processMessage(message) {
    const urgentKeywords = ['suicide', 'kill', 'die', 'end it all', 'no reason to live'];
    const lowerMessage = message.toLowerCase();
    const requiresEscalation = urgentKeywords.some(keyword => lowerMessage.includes(keyword));

    const response = await this.manager.process('en', message);
    const intent = response.intent === 'None' ? 'general' : response.intent;
    const answer = response.answer || "I'm here to listen. Would you like to tell me more about how you're feeling?";

    return {
      intent,
      response: answer,
      requiresEscalation
    };
  }
}

module.exports = Chatbot; 
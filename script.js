const micBtn = document.getElementById('mic-btn');
const display = document.getElementById('display');
const stepsDiv = document.getElementById('steps');
const resultDiv = document.getElementById('result');

// Web Speech API setup
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();

recognition.onstart = () => {
    micBtn.innerText = "Listening...";
};

recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    processCalculation(transcript);
    micBtn.innerText = "🎤 Start Speaking";
};

function processCalculation(query) {
    // Abhi ke liye hum sirf screen par dikhayenge ki user ne kya bola
    stepsDiv.innerText = "Aapne pucha: " + query;
    
    // Yahan hum AI logic lagayenge jo "1999 ka 3 percent" ko calculate karega
    // Iska logic main aapko next step mein dunga!
}

micBtn.addEventListener('click', () => {
    recognition.start();
});

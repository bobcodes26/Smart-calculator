const micBtn = document.getElementById('mic-btn');
const displayResult = document.getElementById('displayResult');
const displaySteps = document.getElementById('displaySteps');
const statusText = document.getElementById('status-text');

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (!SpeechRecognition) {
    alert("Voice support not available!");
} else {
    const recognition = new SpeechRecognition();
    recognition.lang = 'hi-IN';

    recognition.onstart = () => {
        micBtn.classList.add('listening');
        statusText.innerText = "Listening...";
    };

    recognition.onend = () => {
        micBtn.classList.remove('listening');
        statusText.innerText = "Tap to Calculate";
    };

    recognition.onresult = (event) => {
        const query = event.results[0][0].transcript;
        processAI(query);
    };

    const toggleMic = (e) => {
        e.preventDefault();
        recognition.start();
    };

    micBtn.addEventListener('click', toggleMic);
    micBtn.addEventListener('touchstart', toggleMic);
}

function processAI(query) {
    displaySteps.innerText = query;
    const numbers = query.match(/\d+/g);

    if (numbers && numbers.length >= 2) {
        let n1 = parseFloat(numbers[0]);
        let n2 = parseFloat(numbers[1]);
        let result = 0;

        if (query.includes("percent") || query.includes("%") || query.includes("ka")) {
            result = (n1 * n2) / 100;
        }

        displayResult.innerText = result.toFixed(2);
        
        // Voice response
        const msg = new SpeechSynthesisUtterance(`Iska jawab hai ${result.toFixed(2)}`);
        msg.lang = 'hi-IN';
        window.speechSynthesis.speak(msg);
    } else {
        displayResult.innerText = "Error";
        statusText.innerText = "Try: 2000 ka 5 percent";
    }
}

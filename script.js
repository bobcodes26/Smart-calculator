const micBtn = document.getElementById('mic-btn');
const stepsDiv = document.getElementById('steps');
const resultDiv = document.getElementById('result');

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (!SpeechRecognition) {
    alert("Apka browser voice support nahi karta. Please Chrome use karein.");
} else {
    const recognition = new SpeechRecognition();
    recognition.lang = 'hi-IN';

    // Jab mic start ho
    recognition.onstart = () => {
        micBtn.classList.add('listening');
        micBtn.innerHTML = "🛑"; // Stop icon ya change status
    };

    // Jab mic band ho
    recognition.onend = () => {
        micBtn.classList.remove('listening');
        micBtn.innerHTML = "🎤";
    };

    recognition.onresult = (event) => {
        const query = event.results[0][0].transcript;
        processCalculation(query);
    };

    // Click and Touch Events
    const startMic = (e) => {
        e.preventDefault();
        recognition.start();
    };

    micBtn.addEventListener('click', startMic);
    micBtn.addEventListener('touchstart', startMic);
}

function processCalculation(query) {
    const input = query.toLowerCase();
    const numbers = input.match(/\d+/g);

    if (numbers && numbers.length >= 2) {
        let n1 = parseFloat(numbers[0]);
        let n2 = parseFloat(numbers[1]);
        let res = (n1 * n2) / 100;

        stepsDiv.innerHTML = `Pucha: ${query}<br>Step: (${n1} × ${n2}) ÷ 100`;
        resultDiv.innerText = "Jawab: " + res.toFixed(2);
        
        // Voice Answer
        const msg = new SpeechSynthesisUtterance(`Iska jawab hai ${res.toFixed(2)}`);
        msg.lang = 'hi-IN';
        window.speechSynthesis.speak(msg);
    } else {
        resultDiv.innerText = "Sirf numbers boliye, jaise '500 ka 10 percent'";
    }
}

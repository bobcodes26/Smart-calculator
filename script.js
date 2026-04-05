// Button aur Display select karo
const micBtn = document.querySelector('.mic-btn') || document.getElementById('mic-btn');
const stepsDiv = document.getElementById('steps');
const resultDiv = document.getElementById('result');

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (!SpeechRecognition) {
    alert("Browser voice support nahi karta!");
} else {
    const recognition = new SpeechRecognition();
    recognition.lang = 'hi-IN';

    recognition.onstart = () => {
        micBtn.classList.add('listening');
        console.log("Listening...");
    };

    recognition.onend = () => {
        micBtn.classList.remove('listening');
    };

    recognition.onresult = (event) => {
        const query = event.results[0][0].transcript;
        processCalculation(query);
    };

    // Mobile + Desktop support
    const handleMic = (e) => {
        e.preventDefault();
        recognition.start();
    };

    micBtn.addEventListener('click', handleMic);
    micBtn.addEventListener('touchstart', handleMic);
}

function processCalculation(query) {
    const input = query.toLowerCase();
    // Numbers dhoondne ke liye logic
    const numbers = input.match(/\d+/g);

    if (numbers && numbers.length >= 2) {
        let n1 = parseFloat(numbers[0]);
        let n2 = parseFloat(numbers[1]);
        let res = (n1 * n2) / 100;

        document.getElementById('display').innerHTML = `
            <div style="font-size:14px; color:#aaa;">Pucha: ${query}</div>
            <div style="margin:10px 0;">Step: (${n1} × ${n2}) ÷ 100</div>
            <div style="font-size:32px; color:#55efc4;">Result: ${res.toFixed(2)}</div>
        `;
        
        // Voice Answer
        const msg = new SpeechSynthesisUtterance(`Iska jawab hai ${res.toFixed(2)}`);
        msg.lang = 'hi-IN';
        window.speechSynthesis.speak(msg);
    } else {
        alert("Thoda saaf boliye, jaise: 2000 ka 5 percent");
    }
}

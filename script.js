let currentInput = "";
const micBtn = document.getElementById('mic-btn');
const expDiv = document.getElementById('displayExpression');
const resDiv = document.getElementById('displayResult');

// --- Manual Buttons Logic ---
function appendInput(val) {
    currentInput += val;
    expDiv.innerText = currentInput;
}

function clearDisplay() {
    currentInput = "";
    expDiv.innerText = "0";
    resDiv.innerText = "0.00";
}

function backspace() {
    currentInput = currentInput.slice(0, -1);
    expDiv.innerText = currentInput || "0";
}

function calculate() {
    try {
        let result = eval(currentInput);
        resDiv.innerText = Number.isInteger(result) ? result : result.toFixed(2);
    } catch (e) {
        resDiv.innerText = "Error";
    }
}

// --- AI Voice Logic ---
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.lang = 'hi-IN';

    recognition.onstart = () => micBtn.classList.add('listening');
    recognition.onend = () => micBtn.classList.remove('listening');

    recognition.onresult = (event) => {
        const query = event.results[0][0].transcript.toLowerCase();
        expDiv.innerText = query;
        
        // Voice Percentage Logic: "500 ka 10 percent"
        const nums = query.match(/\d+/g);
        if (nums && nums.length >= 2) {
            let n1 = parseFloat(nums[0]);
            let n2 = parseFloat(nums[1]);
            let finalRes = (n1 * n2) / 100;
            resDiv.innerText = finalRes.toFixed(2);
            
            // Voice Answer
            let speak = new SpeechSynthesisUtterance(`Jawab hai ${finalRes}`);
            speak.lang = 'hi-IN';
            window.speechSynthesis.speak(speak);
        }
    };

    micBtn.addEventListener('click', () => recognition.start());
    micBtn.addEventListener('touchstart', (e) => { e.preventDefault(); recognition.start(); });
}

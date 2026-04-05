// 1. Pehle Variable declare karo (Button ko pehchano)
const micBtn = document.getElementById('mic-btn');
const stepsDiv = document.getElementById('steps');
const resultDiv = document.getElementById('result');

// 2. Voice Recognition setup
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();
recognition.lang = 'hi-IN'; // Hindi/Hinglish support

// 3. Jab user bole (Calculation Logic)
recognition.onresult = (event) => {
    const query = event.results[0][0].transcript;
    processCalculation(query);
};

function processCalculation(query) {
    const input = query.toLowerCase();
    const numbers = input.match(/\d+/g); 

    if (numbers && numbers.length >= 2) {
        let n1 = parseFloat(numbers[0]);
        let n2 = parseFloat(numbers[1]);
        let res = (n1 * n2) / 100;

        stepsDiv.innerHTML = `Step: ${n1} ka ${n2}% = (${n1} × ${n2}) ÷ 100`;
        resultDiv.innerText = "Result: " + res.toFixed(2);
    }
}

// 4. Mobile aur Laptop dono ke liye Event Listeners
micBtn.addEventListener('click', () => recognition.start());
micBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    recognition.start();
});

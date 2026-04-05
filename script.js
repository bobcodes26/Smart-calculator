let currentInput = "";
const expDiv = document.getElementById('displayExpression');
const resDiv = document.getElementById('displayResult');

function appendInput(val) {
    if (currentInput === "0") currentInput = "";
    currentInput += val;
    expDiv.innerText = currentInput.replace(/\*/g, '×').replace(/\//g, '÷');
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
        // eval se pehle math symbols ko replace karte hain
        let sanitizedInput = currentInput.replace(/×/g, '*').replace(/÷/g, '/');
        let result = eval(sanitizedInput);
        resDiv.innerText = Number.isInteger(result) ? result : result.toFixed(2);
    } catch (e) {
        resDiv.innerText = "Error";
    }
}

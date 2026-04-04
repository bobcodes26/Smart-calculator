function processCalculation(query) {
    const input = query.toLowerCase();
    stepsDiv.innerHTML = ""; // Purane steps clear karein
    resultDiv.innerHTML = "Calculating...";

    // 1. Percentage Logic (Check: "1999 ka 3 percent")
    if (input.includes("percent") || input.includes("%") || input.includes("pratishat")) {
        
        // Numbers nikalne ke liye (Regex ka use)
        const numbers = input.match(/\d+/g); 

        if (numbers && numbers.length >= 2) {
            let amount = parseFloat(numbers[0]);
            let percent = parseFloat(numbers[1]);
            
            // Calculation
            let finalResult = (amount * percent) / 100;

            // Visual Steps Dikhana
            setTimeout(() => {
                stepsDiv.innerHTML = `
                    <b>Step 1:</b> Amount liya = ${amount}<br>
                    <b>Step 2:</b> Percentage liya = ${percent}%<br>
                    <b>Step 3:</b> Formula: (${amount} × ${percent}) ÷ 100
                `;
                resultDiv.innerText = "Final Result: " + finalResult.toFixed(2);
                
                // Voice Output (AI Bolega bhi)
                speak(`Iska jawab hai ${finalResult.toFixed(2)}`);
            }, 800);
        } else {
            resultDiv.innerText = "Samajh nahi aaya. Dubara boliye?";
        }
    } 
    // Aap yahan Plus, Minus ke aur logics bhi add kar sakte hain
    else {
        resultDiv.innerText = "Abhi main sirf percentage samajhta hoon!";
    }
}

// AI Voice function
function speak(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'hi-IN'; // Hindi voice
    window.speechSynthesis.speak(utterance);
}
// Mic Button ko function se connect karna
micBtn.addEventListener('click', function() {
    try {
        recognition.start();
    } catch (err) {
        console.log("Recognition already started or error: ", err);
    }
});

// Mobile users ke liye fast touch support
micBtn.addEventListener('touchstart', function(e) {
    e.preventDefault(); 
    try {
        recognition.start();
    } catch (err) {
        console.log("Error: ", err);
    }
});

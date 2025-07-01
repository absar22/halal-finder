// ====== Element Selectors ======
// These lines get references to HTML elements so we can change or use them in JavaScript
const barcodeInput = document.querySelector('#barcodeInput');
const checkButton = document.querySelector('#checkButton');
const errorMessage = document.querySelector('#errorMessage');
const loadingMessage = document.querySelector('#loadingMessage');
const productResult = document.querySelector('#productResult');

const productName = document.querySelector('#productName');
const productImage = document.querySelector('#productImage');
const productBrand = document.querySelector('#productBrand');
const halalStatusText = document.querySelector('#halalStatusText');
const problematicIngredientsText = document.querySelector('#problematicIngredientsText');
const ingredientsTextDiv = document.querySelector('#ingredientsText');
const additivesTitle = document.querySelector('#additivesTitle');
const additivesText = document.querySelector('#additivesText');
const labelsTitle = document.querySelector('#labelsTitle');
const labelsText = document.querySelector('#labelsText');

// ====== Keywords Used to Check Halal Status ======
const halalStatusData = {
    haramKeywords: [ /* Clearly Haram ingredients */
        "pork", "lard", "bacon", "ham", "gelatin", "porcine", "swine",
        "pepsin", "alcohol", "ethanol", "wine", "beer", "carrion", "blood",
        "e120", "e920"
    ],
    mushboohKeywords: [ /* Doubtful ingredients (unclear source) */
        "mono- and diglycerides", "e471", "e472", "enzymes", "natural flavors",
        "glycerol", "glycerine", "whey", "rennet", "shortening", "tallow",
        "e153", "e322", "e631"
    ],
    halalClarifiers: [ /* If these are present, the ingredient is probably halal */
        "vegetable gelatin", "fish gelatin", "microbial enzymes", "plant-based",
        "vegetarian", "vegan"
    ]
};

// ====== Utility: Show or Hide Messages (error/loading) ======
function displayMessage(element, message, type) {
    element.textContent = message;
    element.className = 'message ' + type;
    element.style.display = message ? 'block' : 'none';
}

// ====== Utility: Clear all results before new check ======
function clearResults() {
    productResult.style.display = 'none';
    productName.textContent = '';
    productImage.src = '';
    productImage.alt = '';
    productImage.style.display = 'none';
    productBrand.textContent = '';
    halalStatusText.textContent = '';
    halalStatusText.className = '';
    problematicIngredientsText.textContent = '';
    ingredientsTextDiv.textContent = '';
    additivesTitle.style.display = 'none';
    additivesText.textContent = '';
    labelsTitle.style.display = 'none';
    labelsText.textContent = '';
}

// ====== Highlight keywords in ingredient text ======
function highlightIngredients(text, keywords) {
    if (!text) return '';
    let highlightedText = text;
    for (let i = 0; i < keywords.length; i++) {
        let keyword = keywords[i];
        let parts = highlightedText.split(keyword);
        highlightedText = parts.join('<span class="highlight">' + keyword + '</span>');
    }
    return highlightedText;
}


            
            
  // // ====== Main Function: Fetch and Analyze Product ======
    function fetchProduct() {
    let barcode = barcodeInput.value.trim();
    if (!barcode) {
        displayMessage(errorMessage, 'Please enter a barcode.', 'error');
        return;
    }

    clearResults();
    displayMessage(errorMessage, '', 'error');
    displayMessage(loadingMessage, 'Searching for product...', 'loading');
    checkButton.disabled = true;

    // ✅ Using template literal
    let url = `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`;

    fetch(url)
        .then(function(response) {
            return response.json();
        })
        // ... (rest of the code continues)

        .then(function(data) {
            // If product not found, show error
            if (data.status === 0 || !data.product) {
                displayMessage(errorMessage, 'Product not found. Please try another barcode.', 'error');
                return;
            }

            // ===== Displaying Product Details =====
            let product = data.product;
            productResult.style.display = 'block';
            productName.textContent = product.product_name || 'N/A';

            // Show product image if available
            if (product.image_url) {
                productImage.src = product.image_url;
                productImage.alt = product.product_name || 'Product Image';
                productImage.style.display = 'block';
            } else {
                productImage.style.display = 'none';
            }

            productBrand.textContent = 'Brand: ' + (product.brands || 'N/A');

            // Prepare and normalize ingredient data
            let ingredientsText = (product.ingredients_text || '').toLowerCase();
            let additivesTags = (product.additives_tags || []).map(function(tag) {
                return tag.toLowerCase().replace('en:', '');
            });
            let labelsTags = (product.labels_tags || []).map(function(tag) {
                return tag.toLowerCase().replace('en:', '');
            });

            // ===== Check Halal Status =====
            let currentStatus = 'Likely Halal';
            let foundProblematic = [];

            // Check for haram ingredients
            for (let i = 0; i < halalStatusData.haramKeywords.length; i++) {
                let keyword = halalStatusData.haramKeywords[i];
                let found = ingredientsText.includes(keyword) || additivesTags.includes(keyword);
                let hasClarifier = halalStatusData.halalClarifiers.some(function(c) {
                    return ingredientsText.includes(c);
                });
                if (found && !hasClarifier) {
                    currentStatus = 'Haram';
                    foundProblematic.push(keyword);
                }
            }

            // If no haram, check for mushbooh (doubtful) ingredients
            if (currentStatus === 'Likely Halal') {
                for (let j = 0; j < halalStatusData.mushboohKeywords.length; j++) {
                    let keyword2 = halalStatusData.mushboohKeywords[j];
                    let found2 = ingredientsText.includes(keyword2) || additivesTags.includes(keyword2);
                    let hasClarifier2 = halalStatusData.halalClarifiers.some(function(c) {
                        return ingredientsText.includes(c);
                    });
                    if (found2 && !hasClarifier2) {
                        currentStatus = 'Mushbooh (Doubtful)';
                        foundProblematic.push(keyword2);
                    }
                }
            }

            // If still no haram/mushbooh, check for helpful labels
            if (currentStatus === 'Likely Halal') {
                if (labelsTags.includes('halal')) {
                    currentStatus = 'Likely Halal (User-labeled)';
                } else if (labelsTags.includes('vegetarian') || labelsTags.includes('vegan')) {
                    currentStatus = 'Likely Halal (Vegetarian/Vegan labeled)';
                }
            }

            // ===== Display Status =====
            halalStatusText.textContent = currentStatus;
            if (currentStatus.includes('Haram')) {
                halalStatusText.classList.add('status-haram');
            } else if (currentStatus.includes('Mushbooh')) {
                halalStatusText.classList.add('status-mushbooh');
            } else {
                halalStatusText.classList.add('status-halal');
            }

            // Show found problematic ingredients (if any)
            if (foundProblematic.length > 0) {
                problematicIngredientsText.textContent = 'Potential problematic ingredients found: ' + foundProblematic.join(', ');
            }

            // Highlight keywords in the ingredient text
            ingredientsTextDiv.innerHTML = highlightIngredients(ingredientsText, halalStatusData.haramKeywords.concat(halalStatusData.mushboohKeywords));

            // Show additive E-numbers if available
            if (additivesTags.length > 0) {
                additivesTitle.style.display = 'block';
                additivesText.textContent = additivesTags.map(function(tag) {
                    return tag.toUpperCase();
                }).join(', ');
            }

            // Show labels like “halal”, “vegan”, etc.
            if (labelsTags.length > 0) {
                labelsTitle.style.display = 'block';
                labelsText.textContent = labelsTags.map(function(tag) {
                    return tag.split('-').join(' ').toUpperCase();
                }).join(', ');
            }

        })
        .catch(function(err) {
            // If something goes wrong with the API call
            console.error('Error fetching product:', err);
            displayMessage(errorMessage, 'Failed to fetch product data. Please check your internet connection or barcode.', 'error');
        })
        .finally(function() {
            // Hide loading and enable button again
            displayMessage(loadingMessage, '', 'loading');
            checkButton.disabled = false;
        });
}

// ====== Event Listeners ======
// Run the fetch function when button is clicked
checkButton.addEventListener('click', fetchProduct);

// Run fetch when "Enter" key is pressed in input box
barcodeInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        fetchProduct();
    }
});

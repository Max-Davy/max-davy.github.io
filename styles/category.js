const categories = 
    [
        'model',
        'project',
        'website',
        'article',
        'misc'
    ];

currentCategory = "";

function showClass(className) {
    // Hide all cards first
    hideAll();
    // Then get the cards with the input class name and show them
    // Note this also shows the clear icon on the chip for the input category
    // Since the clear icons share the class
    const elements = document.querySelectorAll(`.${className}`);
        elements.forEach(el => {
          el.classList.remove('visuallyhidden');
        });
    currentCategory = className;// Flag what the current category is

    // Get the chip for the input class name
    const element = document.querySelector(`[data-for-category="${className}"]`);
  
    // And set its onclick event to clear the filter
    if (element) {
        element.onclick = function() {
            showAll();
        };
    }

    window.location.hash = "category="+className;
}

function hideAll() {
    // Go through list of categories
    categories.forEach(className => {
        // Get cards for the category
        const elements = document.querySelectorAll(`.${className}`);
        // And hide them
        elements.forEach(el => {
          el.classList.add('visuallyhidden');
        });
      });
}

function showAll() {
    //go through each category in the category list
    categories.forEach(className => {
        // get all card elements with that category
        const elements = document.querySelectorAll(`.${className}`);
        // and make them visible
        // Note this will also make the clear buttons on each chip visible
        // Since the clear buttons share the same class
        elements.forEach(el => {
          el.classList.remove('visuallyhidden');
        });

        // get the chip for that category
        const chipElement = document.querySelector(`[data-for-category="${className}"]`);
        // and set its function back to normal
        if (chipElement) {
            chipElement.onclick = function() {
                showClass(`${className}`)
            };
        }
      });

    // Then go through all the chip clear buttons
    const chipCancelButtons = document.querySelectorAll('.clearfilter');
    // And hide them
    chipCancelButtons.forEach(el=> {
        el.classList.add('visuallyhidden');
    });   
    currentCategory="";
    window.location.hash = "";
}
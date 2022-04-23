
// Wait for page to load
document.addEventListener('DOMContentLoaded', function(event) {
	ready();
})

function ready() {
	let url = 'https://api.sheety.co/b2d25a34b81ecc6a5b3557adc04eb45a/2021NflDraftPool/scoreboard';
	fetch(url)
	.then((response) => response.json())
	.then(json => {
		// Group menu items by their category
		let groupedMenu = _.groupBy(json.scoreboard, 'category');
		// Create a Handlebars template to render items
		var template = Handlebars.compile(document.getElementById("menu-template").innerHTML);
		// Render items into Handlebars template, and set the html of the container element
		document.getElementById('menu').innerHTML = template(groupedMenu);
	});
}


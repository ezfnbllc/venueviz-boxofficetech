Chart.defaults.global.defaultFontFamily = "Roboto";
Chart.defaults.global.defaultFontColor = '#717171';
Chart.defaults.global.defaultFontSize = '12';

		var ctx = document.getElementById('chart').getContext('2d');

		var chart = new Chart(ctx, {
			type: 'line',

			// The data for our dataset
			data: {
				labels: ["1", "2", "3", "4", "5", "6","7", "8", "9", "10", "11", "12","13", "14", "15", "16", "17", "18","19", "20", "21", "22", "23", "24","25", "26", "27", "28", "29", "30"],
				// Information about the dataset
				datasets: [{
					label: "Tickets",
					backgroundColor: 'rgba(255,69,0,0.08)',
					borderColor: '#6ac045',
					borderWidth: "3",
					data: [1,3,2,5,2,4,5,3,4,5,3],
					pointRadius: 5,
					pointHoverRadius:5,
					pointHitRadius: 10,
					pointBackgroundColor: "#fff",
					pointHoverBackgroundColor: "#fff",
					pointBorderWidth: "2",
				}]
			},

			// Configuration options
			options: {

				layout: {
				  padding: 10,
				},

				legend: { display: false },
				title:  { display: false },

				scales: {
					yAxes: [{
						scaleLabel: {
							display: false
						},
						gridLines: {
							 border: [1],
							 color: "rgba(225,225,225,0.5)",
							 lineWidth: 1,
						},
					}],
					xAxes: [{
						scaleLabel: { display: false },  
						gridLines:  { display: false },
					}],
				},

				tooltips: {
				  backgroundColor: '#242424',
				  titleFontSize: 13,
				  titleFontColor: '#fff',
				  bodyFontColor: '#fff',
				  bodyFontSize: 13,
				  displayColors: false,
				  xPadding: 10,
				  yPadding: 10,
				  intersect: false
				}
			},


	});

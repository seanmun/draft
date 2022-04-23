setInterval(function () {
    var d = new Date();
    var seconds = d.getMinutes() * 60 + d.getSeconds(); //convet 00:00 to seconds for easier caculation
    var fiveMin = 60 * 5; //five minutes is 300 seconds!
    var timeleft = fiveMin - seconds % fiveMin; // let's say 01:30, then current seconds is 90, 90%300 = 90, then 300-90 = 210. That's the time left!
    var result = parseInt(timeleft / 60) + ':' + timeleft % 60; //formart seconds into 00:00 
    document.getElementById('test').innerHTML = result;

}, 500) //calling it every 0.5 second to do a count down
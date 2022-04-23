function checklength(i) {
    'use strict';
    if (i < 100) {
        i = "0" + i;
    }
    return i;
}

var minutes, seconds, count, counter, timer;
count = 301; //seconds
counter = setInterval(timer, 1000);

function timer() {
    'use strict';
    count = count - 1;
    minutes = checklength(Math.floor(count / 60));
    seconds = checklength(count - minutes * 60);
    if (count < 0) {
        clearInterval(counter);
        return;
    }
    document.getElementById("timer").innerHTML = 'Next refresh in ' + minutes + ':' + seconds + ' ';
    if (count === 0) {
        location.reload();
    }
}
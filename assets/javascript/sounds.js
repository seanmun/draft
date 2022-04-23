window.onload = function () {
    if (localStorage.getItem("hasCodeRunBefore") === null) {
         document.getElementById("my_audio").play();
        localStorage.setItem("hasCodeRunBefore", true);
    }
}
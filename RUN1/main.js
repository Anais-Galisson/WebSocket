var moveInterval;
var stop = false;

var hasGP = false; //est ce que le gamePad est connecté?
var repGP;

window.onload = function()
{

    if(canGame()) {

        console.log('CanGame : TRUE');

        $(window).on("gamepadconnected", function() {
            hasGP = true;
            console.log("connection event");

            repGP = window.setInterval(reportOnGamepad,100); //On interroge régulièrement le gamePad pour connaître ses variations d'état

        });

        $(window).on("gamepaddisconnected", function() {//récupération de l'événement (cf plus bas)
            console.log("disconnection event");
            window.clearInterval(repGP);
        });

        //Chrome nécessite un petit interval, Firefox, non, mais cela ne dérange pas.
        var checkGP = window.setInterval(function() {
            console.log('checkGP');
            if(navigator.getGamepads()[0]) {
                if(!hasGP) $(window).trigger("gamepadconnected"); //déclenchement de l'événement
                window.clearInterval(checkGP);
            }
        }, 500);

    }

    x = 10;
    y = 10;
    speed = 5;
    angle = 0;
    mod = 1;

    canvas = document.getElementById("canvas");
    context = canvas.getContext("2d");

    moveInterval = setInterval(function()
    {
        draw();
    }, 30);
};

function draw(stop)
{

    if(stop || x-9<0 || x+11>800 || y-9<0 || y+11 > 800){
        clearInterval(moveInterval);
        console.log("stop");
    } else {
        context = canvas.getContext("2d");
        context.clearRect(0, 0, 800, 800);

        x += (speed*mod) * Math.cos(Math.PI/180 * angle);
        y += (speed*mod) * Math.sin(Math.PI/180 * angle);

        // On change la direction du cercle
        context.beginPath();
        context.arc(x,y,10,0,Math.PI*2,true); // Outer circle
        context.stroke();
    }
}


function canGame() {
    return "getGamepads" in navigator;
}

function reportOnGamepad() {
    var gp = navigator.getGamepads()[0];
   console.log("id: "+gp.id+"<br/>"); //l'objet gamePad a un identifiant de vendeur


    for(var i=0;i<gp.axes.length; i+=2) {//gestion de l'information du joystic (ou du pavé gauche: seulement 2 axes pour Vertical ou horizontal)
        console.log("Stick "+(Math.ceil(i/2)+1)+": "+gp.axes[i]+","+gp.axes[i+1]);
        if(gp.axes[i] == 1 && gp.axes[i+1]==0){
            angle += 20;
        }
        if(gp.axes[i] == -1 && gp.axes[i+1]==0){
            angle -= 20;
        }
        if(gp.axes[i] == 0 && gp.axes[i+1]==-1){
            //ralentir
            if(speed < 10){
                speed = speed +1;
            }
        }
        if(gp.axes[i] == 0 && gp.axes[i+1]==1){
            if(speed > 3){
                speed = speed -1;
            }
        }
    }
}

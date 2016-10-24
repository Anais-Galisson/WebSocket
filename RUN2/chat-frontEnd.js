var context, canvas;
var stop = false;

var hasGP = false; //est ce que le gamePad est connecté?
var repGP;

var gauche, droite, accelerer, ralentir;
var voiture = [];

$(function () {
    "use strict";

    // for better performance - to avoid searching in DOM
    var content = $('#content');
    var status = $('#status');

    //  Couleur assigné par le serveur, sert d'identifiant
    var myColor = false;

    // Ouvre la connexion webSocket
    var connection = new WebSocket('ws://127.0.0.1:1099');

    // if user is running mozilla then use it's built-in WebSocket
    window.WebSocket = window.WebSocket || window.MozWebSocket;

    // if browser doesn't support WebSocket, just show some notification and exit
    if (!window.WebSocket) {
        content.html($('<p>', { text: 'Sorry, but your browser doesn\'t '
        + 'support WebSockets.'} ));
        return;
    }

    /**
     * Permet de récupérer l'évènement lorsque l'utilisateur appuie sur une des flèches du clavier
     * @param event
     */
    function keypress_handler(event) {
        console.log(myColor);
        switch ( event.keyCode ) {
            case 37: // Flèche gauche
                gauche = true;
                break;
            case 39: // Flèche droite
                droite = true;
                break;
            case 38: // Flèche haute
                accelerer = true;
                break;
            case 40: // Flèche basse
                ralentir = true;
                break;
        }
        update();
    }

    if(canGame()){ // Si le navigateur de l'utilisateur peut utiliser le gamePad sur son navigateur

        console.log('CanGame : TRUE');

        canvas = document.getElementById("canvas");
        context = canvas.getContext("2d");
        /**
         * Lorsque l'on reçoit un message du serveur
         * @param message
         */
        connection.onmessage = function (message) {
            try {
                var json = JSON.parse(message.data);
            } catch (e) {
                console.log('This doesn\'t look like a valid JSON: ', message.data);
                return;
            }

            if (json.type == 'color') { // le serveur envoie la couleur prédéfinie à l'utilisateur
                myColor = json.data;
                status.text('Your color is : '+myColor);
                // On envoie au serveur que le client a bien obtenue sa couleur de référence
                json = JSON.stringify({ type:'initialisation', data: myColor });
                connection.send(json);
            } else if(json.type == 'error'){ // s'il y a trop de personnes connectés, on ne peut établir la connexion
                alert(json.data);
            } else if(json.type == 'coords_depart'){ // On initialise le jeu: envoie les coordonnées de départ
                voiture = json.data;
                console.log("coordonnées de départ : " + voiture[1] +","+ voiture[2]);
                console.log('Votre couleur est : '+voiture[0]);
                drawInit(voiture);
            } else if(json.type === 'movement'){ // lorsqu'il y a un mouvement dans le jeu
                var clients = json.data;
                draw(clients);
            } else if(json.type == 'collision'){ // lorsqu'une collision apparait

                json = JSON.stringify({ type:'deconnexion', data: voiture });
                connection.send(json);
                console.log('Vous avez perdu ! Vous allez être déconnecté.');
            }
        }
    }

    $(document).ready(function () {

        /***** Gestion du Gamepad ******/

        $(window).on("gamepadconnected", function () {
            hasGP = true;
            console.log(navigator.getGamepads()[0]);
            repGP = window.setInterval(reportOnGamepad(connection), 100); //On interroge régulièrement le gamePad pour connaître ses variations d'état

        });

        $(window).on("gamepaddisconnected", function () {//récupération de l'événement (cf plus bas)
            console.log("disconnection event");
            window.clearInterval(repGP);
        });

        //Chrome nécessite un petit interval, Firefox, non, mais cela ne dérange pas.
        var checkGP = window.setInterval(function () {
            if (navigator.getGamepads()[0]) {
                if (!hasGP) $(window).trigger("gamepadconnected"); //déclenchement de l'événement
                window.clearInterval(checkGP);
            }
        }, 500);

        // ajout d'un evenement si une des touches du clavier est appuyée
        window.addEventListener("keydown", keypress_handler, false);

        /***** Gestion de la webCam ******/


    });

    /**
     * Si le joueur a une interaction avec sa voiture, il envoie un message au serveur
     */
    function update() {

        if ( accelerer ) {
            var data = "accelerer";
            var json = JSON.stringify({ type:'movement', data: data });
            connection.send(json);
            accelerer = false;
        }
        if ( ralentir ) {
            connection.send(JSON.stringify({ type : 'movement', data : 'ralentir' }));
            ralentir = false;
        }
        if ( droite ) {
            connection.send(JSON.stringify({ type : 'movement', data : 'right' }));
            droite = false;
        }
        if ( gauche ) {
            connection.send(JSON.stringify({ type : 'movement', data : 'left' }));
            gauche = false;
        }
    }

});


/**
 * Affichage de l'initialisation du jeu (plateau + voiture avec ses coordonnées de départ)
 * @param voiture
 */
function drawInit(voiture) {

    context = canvas.getContext("2d");
    context.clearRect(0, 0, 500, 500);

    context.beginPath();
    context.arc(voiture[1], voiture[2], 10, 0, Math.PI * 2, true); // Outer circle
    context.fill();
    context.fillStyle = voiture[0];
    context.stroke();

}

/**
 * fonction utilisée pour animer le jeu
 * @param clients
 */
function draw(clients) {

    // On change la direction du cercle

    context = canvas.getContext("2d");
    context.clearRect(0, 0, 500, 500);

    for(var i=0; i<clients.length; i++){
        var voitureServeur = clients[i];
        console.log("\n couleur :" +voitureServeur[0]+"\n");
        context.beginPath();
        context.arc(voitureServeur[1], voitureServeur[2], 10, 0, Math.PI * 2, true); // Outer circle

        context.fillStyle = voitureServeur[0];
        context.fill();
        console.log(voitureServeur[0]);
        context.stroke();
    }



}

/*** PARTIE GAMEPAD ***/

/**
 * Véfifie que le navigateur supporte le gamePad
 * @returns {boolean}
 */
function canGame() {
    return "getGamepads" in navigator;
}

/**
 * récupère les touches appuyées sur le gamePad
 * @param connection
 */
function reportOnGamepad(connection) {

    var gp = navigator.getGamepads()[0];
    console.log('report on game connection');

    for(var i=0;i<gp.buttons.length; i+=2) {//gestion de l'information du joystic (ou du pavé gauche: seulement 2 axes pour Vertical ou horizontal)
        // 39->droite 37->gauche 38->up 40->down
        if(gp.axes[i] == 1 && gp.axes[i+1]==0 ){
            console.log('right');
            angle += 20;
            var json = JSON.stringify({ type:'gamepadAngle', data: 'right' });
            connection.send(json);
        }
        if(gp.axes[i] == -1 && gp.axes[i+1]==0 ){
            console.log('left');
            angle -= 20;
            var json = JSON.stringify({ type:'gamepadAngle', data: 'left' });
            connection.send(json);
        }
        if(gp.axes[i] == 0 && gp.axes[i+1]==-1 ){
            console.log('up');
            var json = JSON.stringify({ type:'gamepadSpeed', data: 'up' });
            connection.send(json);
            if(speed < 10){
                speed = speed +1;
            }
        }
        if(gp.axes[i] == 0 && gp.axes[i+1]==1){
            console.log('down');
            var json = JSON.stringify({ type:'gamepadSpeed', data: 'down' });
            connection.send(json);
            if(speed > 3){
                speed = speed -1;
            }
        }
    }

}



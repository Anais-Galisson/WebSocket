process.title = 'node-game';

var webSocketsServerPort = 1099;

// websocket and http servers
var webSocketServer = require('websocket').server;
var http = require('http');

/**
 * Global variables
 */
// Array with some colors
var colors = [ 'red', 'green', 'blue', 'magenta', 'purple', 'plum', 'orange' ];
// ... in random order
colors.sort(function(a,b) { return Math.random() > 0.5; } );
var clients = []; // Contient l'ensemble des clients connectés au serveur
var nbClientsPossible = 4 ; // nbre de connexions de joueur max autorisés
var firstPositionRandom = [50,50,100,100,200,200,150,200]; // Contient les positions de départ des joueurs
var i = 0;
var canvaWidth = 500; // Taile de l'aire de jeux
var moveInterval; // Boucle de jeu

/**
 * HTTP server
 */
var server = http.createServer(function(request, response) {
    // Not important for us. We're writing WebSocket server, not HTTP server
});
server.listen(webSocketsServerPort, function() {
    console.log((new Date()) + " Server is listening on port " + webSocketsServerPort);
});
/**
 * WebSocket server
 */
var wsServer = new webSocketServer({
    // WebSocket server is tied to a HTTP server. WebSocket request is just
    // an enhanced HTTP request. For more info http://tools.ietf.org/html/rfc6455#page-6
    httpServer: server
});


/**
 * Renvoie la position d'une voiture en fonction des paramètres suivant:
 * @param xPos
 * @param yPos
 * @param speed
 * @param angle
 * @param mod
 * @returns {Array}
 */
function calculCoords(xPos,yPos, speed, angle,mod) {

    var result = [];

    if ( xPos - 9 < 0 || xPos + 11 > canvaWidth || yPos - 9 < 0 || yPos + 11 > canvaWidth) {
        // Il y a collision avec le terrain de jeu
        console.log('-- Collision avec le terrain --');
        yPos = 0;
        xPos  = 0;
        result[0] = xPos; // x
        result[1]= yPos; // y
        result[2] = true; // S'il y a collision ou non

    } else {
        // Il n'y a pas collision avec le terrain de jeu
        xPos += (speed * mod) * Math.cos(Math.PI / 180 * angle);
        yPos += (speed * mod) * Math.sin(Math.PI / 180 * angle);
        result[0] = xPos;
        result[1]= yPos;
        result[2] = false;

    }

    if(clients.length > 1){
        for( i=1; i<clients.length ; i++ ){
            var voiture1 = clients[i-1];
            var voiture2 = clients[i];
            console.log(Math.round(voiture1[1])+" == "+ Math.round(voiture2[1]));
            if (Math.round(voiture1[1])+9 >= Math.round(voiture2[1]) ||
                Math.round(voiture1[1]) <= Math.round(voiture2[1]) +9
                && Math.round(voiture1[2])+9 >= Math.round(voiture2[2])
                && Math.round(voiture1[2]) <= Math.round(voiture2[2]+9)
            ){
                console.log("\n -- Collision entre"+voiture1[0]+"et "+voiture2[0]+"\n");
                result[2] = true;
                yPos = null;
                xPos  = null;
                result[0] = xPos; // x
                result[1]= yPos; // y
            }
        }
    }

    return result;
}



wsServer.on('request', function(request) {
    /** Variables d'un client **/
    var index;
    var voiture = []; // voiture [0] = color voiture[1]=x voiture[1]=y
    var userColor = false;
    var x = 10;
    var y =10;
    var speed = 1;
    var angle = 0;
    var mod = 1;
    var init = false;
    var pt_depart = [];
    var collision = false;
    var deco = false;
    var connection = request.accept(null, request.origin);
    var indexClient = clients.push(connection) - 1;

    console.log((new Date()) + ' Connection  from origin ' + request.origin);

    /*** Connexion du client ***/
     if( !( clients.length > 0) || clients.length < (nbClientsPossible+1) ){
         console.log((new Date()) + ' Connection accepted.');

         // Choix aléatoire de la couleur parmis les couleurs du tableau colors
         userColor = colors.shift();
         // On envoie de la couleur au client
         connection.sendUTF(JSON.stringify({ type:'color', data: userColor }));

         voiture[0] = userColor;
         voiture[1]=x;
         voiture [2] = y;
         clients[indexClient] = voiture; // mise à jour du tableau client

         console.log("Nouvelle connexion de : "+ userColor + " a l'index :"+ indexClient + "dans tableau :" +clients);
     } else {
         console.log((new Date()) + ' Connection refused : There is too many people connected.');
         connection.sendUTF(JSON.stringify({ type:'error', data: "Trop de personnes sont connectés, vous devez rafraichir la page pour retenter de jouer" }));
         console.log(clients);
     }

    /*** Le serveur reçoit un message du client ***/
    connection.on('message', function(message) {
        // On essaie de récupérer le message envoyé
        try {
            var json = JSON.parse(message.utf8Data);
        } catch (e) {
            console.log('This doesn\'t look like a valid JSON: ', message.data);
            return;
        }

        if (message.type === 'utf8' && userColor!=false && deco==false) {// accepte seulement les message de type texte et si le client a une couleur attribué
            if (json.type === "initialisation") {
                // INITIALISATION POSITION DE DEPART
                x = firstPositionRandom[i];
                pt_depart[0] = x;
                i++;
                y = firstPositionRandom[i];
                pt_depart[1] = y;
                i++;

               // indexClient = clients.indexOf(voiture);
                // On initialse l'objet "voiture" et on le met dans le tableau clients
                voiture[1] = pt_depart[0];
                voiture[2] = pt_depart[1];
                clients[indexClient] = voiture;

                // on envoie la position au joueur concerné
                connection.sendUTF(JSON.stringify({ type:'coords_depart', data: voiture }));

                init = true;

            }  else if (json.type == "movement" && init){

                if(json.data == "left") {
                    angle -= 20;

                } else if(json.data == "right"){
                    angle += 20;
                } else if (json.data == "run") {
                    if(speed < 10){
                        speed = speed +1;
                    }
                    console.log("up");
                } else if (json.data == "slow") {
                    if(speed > 3){
                        speed = speed -1;
                    }
                }

                var coords = calculCoords(x,y,speed,angle,mod);
                x = coords[0];
                y = coords[1];
                collision = coords[2];
                console.log('---- '+collision+' ----');
                // S'il y a collision .. Sinon

                    // On met à jour les coordonnées de la voiture
                    voiture[1] = x;
                    voiture[2] = y;

                    /*console.log("---------- MOVEMENT OF "+userColor+"---------");
                     console.log("clients : \n"+ clients +"\n");
                     console.log("---------- END MOVEMENT ---------");
                     */
                    clients[indexClient] = voiture;
                    connection.sendUTF(JSON.stringify({ type:'movement', data: clients }));

                    console.log('\n CLIENTS : '+clients+'\n');

            } else if(json.type == "deconnexion"){
                console.log(' \n--- Tentative de deconnexion de '+userColor+' ---\n')
                connection.close();
            }
        }
    });

    // user disconnected
    connection.on('close', function(connection) {
        if (userColor !== false) {
            deco = true;
            collision = false; // TODO : verifier l'utilité de cette variable
            console.log((new Date()) + " Player " +userColor+ " is disconnected.");
            // remove user from the list of connected clients
            // CHERCHER l'index ou la couleur se truove dans le tableau
            indexClient = clients.indexOf(voiture);
            console.log(" Deconnexion de : "+clients[indexClient]+"  Avec l'index :"+indexClient);
            clients.splice(indexClient,1);
            console.log("Tableau après déco de "+userColor+": à l'index: "+indexClient+"\n CLIENTS :"+clients);
            // push back user's color to be reused by another user
            colors.push(userColor);
            i = i-2;
            console.log("Normalement, le client "+userColor+" doit être déco et supprimé du tableau");
            console.log("---------- close "+userColor+"---------");
            console.log('Client:'+clients);
            console.log("---------- fin close ---------");
        }
    });


    moveInterval = setInterval(function()
    {
        if( init == true && deco == false && collision==false){

            var coords = calculCoords(x,y,speed,angle,mod);
            x = coords[0];
            y = coords[1];
            collision = coords[2];
            
            voiture[1] = x;
            voiture[2] = y;
            voiture[0] = userColor;
            clients[indexClient] = voiture;
            /*console.log("---------- setInterval "+userColor+"---------");
            console.log('Client:'+clients);
            console.log("---------- fin setInterval ---------");*/

            connection.sendUTF(JSON.stringify({ type:'movement', data: clients }));


        } else if (collision == true){
            connection.sendUTF(JSON.stringify({ type:'collision', data: "end" }));
            console.log('-- Collision envoyee  --');
            connection.close();
            console.log(' \n--- Tentative de deconnexion de '+userColor+' ---\n')
            deco == true;
        } else if  (deco == true ) {
            clearInterval(moveInterval);
        }

    },150);

});



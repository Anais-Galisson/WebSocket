

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
var clients = [];
var nbClientsPossible = 4 ;
var firstPositionRandom = [50,50,100,100,200,200,150,200];
var i = 0;
var canvaWidth = 500;
var moveInterval;

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
 * Renvoie les x,y d'une voiture en fonction des paramètres suivant:
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

        yPos = 0;
        xPos  = 0;
        result[0] = xPos; // x
        result[1]= yPos; // y
        result[2] = true; // S'il y a collision ou non
        return result;

    } else {
        xPos += (speed * mod) * Math.cos(Math.PI / 180 * angle);
        yPos += (speed * mod) * Math.sin(Math.PI / 180 * angle);
        result[0] = xPos;
        result[1]= yPos;
        result[2] = false;

    }

    return result;
}



wsServer.on('request', function(request) {
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
    index = clients.push(connection) - 1;

    console.log((new Date()) + ' Connection  from origin ' + request.origin);

    /*** Connexion du client ***/
     if( !( clients.length > 0) || clients.length <= nbClientsPossible){
         console.log((new Date()) + ' Connection accepted.');

         // choix random de la couleur parmis les couleurs du tableau colors
         userColor = colors.shift();
         connection.sendUTF(JSON.stringify({ type:'color', data: userColor })); // envoie de la couleur au client

         voiture[1]=x;
         voiture [2] = y;
         clients[index] = voiture; // mise à jour du tableau client

         console.log("Nouvelle connexion de : "+ userColor + " a l'index :"+ index + "dans tableau :" +clients);
     } else {
         console.log((new Date()) + ' Connection refused : There is too many people connected.');
         connection.sendUTF(JSON.stringify({ type:'error', data: "Trop de personnes sont connectés, vous devez rafraichir la page pour retenter de jouer" }));
         console.log(clients);
         console.log('trop de monde de co');
     }

    /*** Le serveur reçoit un message du client ***/
    connection.on('message', function(message) {
        try {
            var json = JSON.parse(message.utf8Data);
        } catch (e) {
            console.log('This doesn\'t look like a valid JSON: ', message.data);
            return;
        }

        if (message.type === 'utf8' && userColor) {// accept only text
            if (json.type === "initialisation") {
                // INITIALISATION POSITION DE DEPART
                x = firstPositionRandom[i];
                pt_depart[0] = x;
                console.log("X a été initialisé : "+x);
                i++;
                y = firstPositionRandom[i];
                pt_depart[1] = y;
                console.log("Y a été initialisé : "+y);
                i++;

                var indexNow = clients.indexOf(voiture);
                // On initialse l'objet "voiture" et on le met dans le tableau clients
                voiture[1] = pt_depart[0];
                voiture[2] = pt_depart[1];
                clients[indexNow] = voiture;

                connection.sendUTF(JSON.stringify({ type:'coords_depart', data: voiture })); // on envoie la position au joueur concerné

                console.log("Le joueur "+userColor+" est positionné à "+x+","+y);
                init = true;

            }  else if (json.type == "movement" && init){

                if(json.data == "left") {
                    angle -= 20;

                } else if(json.data == "right"){
                    angle += 20;
                } else if (json.data == "accelerer") {
                    if(speed < 10){
                        speed = speed +1;
                    }
                    console.log("up");
                } else if (json.data == "down") {
                    if(speed > 3){
                        speed = speed -1;
                    }
                }

                var coords = calculCoords(x,y,speed,angle,mod);
                x = coords[0];
                y = coords[1];
                collision = coords[2];

                var indexNow = clients.indexOf(voiture);
                voiture[1] = x;
                voiture[2] = y;

                console.log("---------- movement "+userColor+"---------");
                console.log("clients : \n"+ clients +"\n");
                console.log("---------- fin movement ---------");

                clients[indexNow] = voiture;
                console.log('CLIENTS : '+clients);
                connection.sendUTF(JSON.stringify({ type:'movement', data: clients }));
            } else if(json.type == "deconnexion"){
                console.log(' \nTentative de deconnexion\n')
                connection.close();
            }
        }
    });

    // user disconnected
    connection.on('close', function(connection) {
        if (userColor !== false) {
            collision = false;
            console.log((new Date()) + " Player " +userColor+ " disconnected.");
            // remove user from the list of connected clients
            // CHERCHER l'index ou la couleur se truove dans le tableau
            var indexDeco = clients.indexOf(voiture);
            console.log(" Deconnexion de : "+clients[indexDeco]+"  Avec l'index :"+indexDeco);
            clients.splice(indexDeco,1);
            console.log("Tableau après déco de "+userColor+": à l'index: "+indexDeco+"\n CLIENTS :"+clients);
            // push back user's color to be reused by another user
            colors.push(userColor);
            i = i-2;
            console.log("Normalement, le client "+userColor+" doit être déco et supprimé du tableau");
            console.log("---------- close "+userColor+"---------");
            console.log('Client:'+clients);
            console.log("---------- fin close ---------");
            deco = true;
        }
    });

    moveInterval = setInterval(function()
    {
        if( init == true && deco == false){

            var coords = calculCoords(x,y,speed,angle,mod);
            x = coords[0];
            y = coords[1];
            collision = coords[2];
            
            voiture[1] = x;
            voiture[2] = y;
            voiture[0] = userColor;
            clients[index] = voiture;
            console.log("---------- setInterval "+userColor+"---------");
            console.log('Client:'+clients);
            console.log("---------- fin setInterval ---------");

            
            if(collision == true){
               // console.log('\nIl y a collision, on envoi au client.\n')
                connection.sendUTF(JSON.stringify({ type:'collision', data: clients }));
            } else {
                connection.sendUTF(JSON.stringify({ type:'movement', data: clients }));
            }

        }

    },150);

});



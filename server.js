var express			= require('express');
var app				= express();
var server			= require('http').createServer(app);
var io 				= require('socket.io').listen(server);
var shortId 		= require('shortid');


app.set('port', process.env.PORT || 3000);

var Users = {};

var Games = {};

var clients	= [];

io.on('connection', function (socket) {//default event for client connect to server

    var currentUser;

    socket.on('USER_CONNECT', function (){
        console.log('Users Connected ');
    });

    socket.on('Signup', function (data){
        Users[data['name']] = data['password'];
        console.log(Users);
    });

    socket.on('Login', function (data){
        var name = data['name'];
        console.log(name);
        var p = Users[name];
        if(p!=undefined){
          socket.emit('LoginSucessful',{status: "True"} );
        }
    });

    socket.on('LOAD_ROOM', function(data){
      console.log(data);
      console.log(Games[data['room']]["participants"]);
      if(Games[data['room']]!=undefined){

        var name = data['name'];
        Games[data['room']]["participants"][name]={"Location": "0,0", "AP":500};
        Games[data['room']]["participants_in_order"].push(name);
        console.log(Games);
        socket.emit('LOAD_ROOM_SUCCESS',{status: "True"} );
      }
    });

    socket.on('CREATE_ROOM', function(data){

      var room_number = data['room'];
      var name = data['name'];
      Games[room_number] = {"participants":  {[name] :{"Location": "0,0", "AP":500}} , "Owner": data['name'], "Turn": data['name'], "participants_in_order" : [name]}//participants need to be changed to a list
      console.log(Games);
      socket.emit('CREATE_ROOM_SUCCESS',{status: "True"} );
    });

    socket.on('gameSetUp', function(data){
      console.log("gameSetUp");
      var room_number = data['room'];
      var level = data['level'];
      var numberOfPlayer = data['numberOfPlayer'];
      Games[room_number]["level"] = level;
      Games[room_number]["numberOfPlayer"] = numberOfPlayer;
      console.log(Games[room_number]);
      socket.emit('gameSetUp_SUCCESS',{status: "True"} );
    });

    socket.on('startGame', function(data){
      console.log("startGame");
      socket.emit('startGame_SUCCESS',Games);
    });

    socket.on('PLAY', function (data){
        currentUser = {
            name:data.name,
            id:shortId.generate(),
            position:data.position
        }

        clients.push(currentUser);
        socket.emit('PLAY',currentUser );
        socket.broadcast.emit('USER_CONNECTED',currentUser);

    });

    socket.on('disconnect', function (){//a default event

        socket.broadcast.emit('USER_DISCONNECTED',currentUser);
        for (var i = 0; i < clients.length; i++) {
            if (clients[i].name === currentUser.name && clients[i].id === currentUser.id) {

                console.log("User "+clients[i].name+" id: "+clients[i].id+" has disconnected");
                clients.splice(i,1);

            };
        };

    });

    socket.on('MOVE', function (data){

        // currentUser.name = data.name;
        // currentUser.id   = data.id;
        currentUser.position = data.position;

        socket.broadcast.emit('MOVE', currentUser);
        console.log(currentUser.name+" Move to "+currentUser.position);


    });

    socket.on('Location', function (data) {
        var room_number = data['room'];
        var Location = data['Location'];
        var name = data['name'];

        var participants = Games[room_number]["participants"];
        participants[name]["Location"] = Location;
        console.log(Games[room_number]);
        socket.emit('LocationSetUp_SUCCESS',{status: "True"} );

        socket.broadcast.emit('LocationUpdate_SUCCESS',Games);
    });

    socket.on('UpdateTile',function(data){
        console.log("Updating tile");
        var x = data['x'];
        var z = data['z'];
        var type = data['type'];
        console.log(x);
        console.log(z);
        console.log(type);
        socket.broadcast.emit('TileUpdate_Success', {"x":x, "z":z, "type":type});
    });

    socket.on('UpdateWall',function(data){
        console.log("Updating wall");
        var x = data['x'];
        var z = data['z'];
        var type = data['type'];
        var horizontal = data["horizontal"];
        console.log(x);
        console.log(z);
        console.log(type);
        console.log(horizontal);
        socket.broadcast.emit('WallUpdate_Success', {"x":x, "z":z, "type":type, "horizontal":horizontal});
    });

    socket.on('UpdateDoor',function(data){
        console.log("Updating door");
        var x = data['x'];
        var z = data['z'];
        var type = data['type'];
        var toType = data["toType"];
        console.log(x);
        console.log(z);
        console.log(type);
        console.log(toType);
        socket.broadcast.emit('DoorUpdate_Success', {"x":x, "z":z, "type":type, "toType":toType});
    });

    socket.on('checkingTurn',function(data){
      var room_number = data['room'];
      var name = data['name'];

      //console.log(Games[room_number]);
      // console.log(Games[room_number]['Turn']);
      var turn_name = Games[room_number]['Turn'];
      if(turn_name.localeCompare(name)==0){
        socket.emit('checkingTurn_Success', {"status": "True"});
      }else{
        socket.emit('checkingTurn_Success', {"status": "False"});
      }

    });

    socket.on('changingTurn', function(data){
        var room_number = data['room'];
        var name = data['name'];

        console.log(Games[room_number]);
        // console.log(Games[room_number]['Turn']);
        var turn_name = Games[room_number]['Turn'];
        if(turn_name.localeCompare(name)==0){//name matches
            var participants_in_order = Games[room_number]["participants_in_order"];
            var index = participants_in_order.indexOf(turn_name);
            if(index == participants_in_order.length-1){
              index = 0;
            }else{
              index = index+1;
            }
            Games[room_number]['Turn'] = participants_in_order[index];
            console.log(Games[room_number]['Turn']);
            socket.emit("changingTurn_Success", {"Turn": Games[room_number]['Turn']});//change isMyTurn to False in frontend
            socket.broadcast.emit("isMyTurnUpdate", {"Turn": Games[room_number]['Turn']});
        }else{
            console.log("name doesn't match in changing turn")
            socket.emit('changingTurn_Success', {"status": "True"});//keep isMyTurn unchanged
        }
    });

    socket.on('sendChat', function(data){
      var name = data['name'];
      var chat = data['chat'];

      socket.broadcast.emit('sendChat_Success', {"name": name, "chat": chat});
    });


});


server.listen( app.get('port'), function (){
    console.log("------- server is running ------- on port 3000");
} );

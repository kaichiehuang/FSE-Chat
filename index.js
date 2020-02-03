var app = require('express')();
var http = require('http');
var server = http.createServer(app);
var io = require('socket.io')(server);
const mongoose = require('mongoose');
const uri = "mongodb+srv://jameshuang304:chatchatchat@cluster0-7dybv.mongodb.net/FSE_chat?retryWrites=true&w=majority";
var newest_user;

server.listen(3000, function () {
  console.log('listening on *:3000');
});

//connect to atlas mongodb
mongoose.connect(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

mongoose.connection.on('connected', function () {
  console.log('Mongoose is connected!');

  //schemas
  const messageSchema = new mongoose.Schema({
    name: String,
    time: String,
    msg: String
  });

  const userSchema = new mongoose.Schema({
    usr: String,
    pwd: String
  });

  //model
  const Message = mongoose.model('Message', messageSchema);
  const User = mongoose.model('User', userSchema);

  //routing
  app.get('/', function (req, res) {
    res.sendFile(__dirname + '/login.html');
  });
  app.get('/chat', function (req, res) {
    res.sendFile(__dirname + '/chat.html');
  });
  // app.get('/logout', function (req, res) {
  //   res.sendFile(__dirname + '/login.html');
  // });

  io.on('connection', function (socket) {
    console.log('a user connected');

    //retrieve history message by id
    Message.find({}).sort({ _id: 1 }).exec(function (err, res) {
      if (err) {
        throw err;
      }
      //emit history message to all users
      res.forEach(function (val) {
        io.to(socket.id).emit('chat message', val);
      })
    });

    //handle incoming chat
    socket.on('chat message', function (msg_obj) {
      var in_message = new Message({
        name: msg_obj.name,
        time: msg_obj.time,
        msg: msg_obj.msg
      });

      //save message and metadata to database
      in_message.save(function (err) {
        if (err) {
          console.log('Fail to save message to database');
        } else {
          console.log('Message data saved!');
        }
      });
      //broadcast message to all users
      io.sockets.emit('chat message', msg_obj);
    });

    // handle sign in
    socket.on('signin', function (usr_obj) {
      //check if user name exist
      //retrieve history message by id
      User.findOne({ usr: usr_obj.usr }, function (err, res) {
        if (err) {
          throw err;
        }
        newest_user = usr_obj.usr;

        //exists or not
        if (res) {
          //check if password if correct
          if (usr_obj.pwd == res.pwd) {
            io.to(socket.id).emit('pwd_correct', usr_obj.usr);
          } else {
            io.to(socket.id).emit('pwd_incorrect');
            console.log("wrong pwd");
          }
        } else {
          io.to(socket.id).emit('usr_no_exists');
        }

      });
    });

    // handle user sign up
    socket.on('signup', function (usr_obj) {
      //check if user name exist
      //retrieve history message by id
      User.findOne({ usr: usr_obj.usr }, function (err, res) {
        if (err) {
          throw err;
        }

        //exists or not
        if (res) {
          io.to(socket.id).emit('usr_exits');
        } else {
          //write to user database
          var newUser = new User({
            usr: usr_obj.usr,
            pwd: usr_obj.pwd
          });
          //save message and metadata to database
          newUser.save(function (err) {
            if (err) {
              console.log('Fail to save user to database');
            } else {
              console.log('User data saved!');
              io.to(socket.id).emit('usr_created');
            }
          });
        }
      });
    });

    // handle user name request
    socket.on('get user', function () {
      io.to(socket.id).emit('give user', newest_user);
    });

  });

});









// constants
const path = require('path');
const constants = require(path.resolve('./config/constants'));


function _clear_prev_timeout(socket){
    if (socket.request.timeoutInstance){
      clearTimeout(socket.request.timeoutInstance);
      socket.request.timeoutInstance = null;
    }
}

function _clear_prev_interval(socket) {
  if (socket.request.intervalInstance){
    clearInterval(socket.request.intervalInstance);
    socket.request.intervalInstance = null;
  }
}

function auto_end_miss_match_game_timeout(socket, redisClient, gameRoom, destroyInstance, callback){
    _clear_prev_timeout(socket);
    let timeoutInstance = setTimeout(function () {
        socket.request.timeoutInstance = null;
        redisClient.get(gameRoom, function (err, gameRoom) {
            if (!err){
                gameRoom = JSON.parse(gameRoom);
                if(gameRoom.step === 0) {
                    destroyInstance(socket, redisClient, constants.ENDED_TIMEOUT);
                }
            }
        });
    }, constants.TIMEOUT_AUTO_END_MISS_MATCH);

    callback(timeoutInstance);
}

function auto_end_miss_ready_game_timeout(socket, redisClient, gameRoom, destroyInstance, callback){
    _clear_prev_timeout(socket);
    let timeoutInstance = setTimeout(function () {
        socket.request.timeoutInstance = null;
        redisClient.hgetall(gameRoom, function (err, gameData) {
            if (!err && gameData.step <3){
                destroyInstance(socket, redisClient, constants.ENDED_TIMEOUT);
            }
        });
    }, constants.TIMEOUT_AUTO_END_MISS_READY);

    callback(timeoutInstance);
}

function auto_roll_first_dice_interval(io, socket, redisClient, middleInstance, finalInstance, callback){
  _clear_prev_timeout(socket);
  let remainTime = constants.TIMEOUT_AUTO_DICE_FIRST_ROLL;
  let intervalInstance = setInterval(function () {
    remainTime = remainTime - 1;
    if (remainTime === 0){
      socket.request.intervalInstance = null;
      finalInstance(io, socket, redisClient);
    } else {
      middleInstance(remainTime);
    }
  }, 1000);
  callback(intervalInstance);
}

exports.auto_end_miss_match_game_timeout = auto_end_miss_match_game_timeout;
exports.auto_end_miss_ready_game_timeout = auto_end_miss_ready_game_timeout;
exports.auto_roll_first_dice_interval = auto_roll_first_dice_interval;

exports.clear_prev_timeout = _clear_prev_timeout;
exports.clear_prev_interval = _clear_prev_interval;

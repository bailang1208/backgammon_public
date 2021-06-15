// common constants

module.exports = {
    // common game status
    GAME_STATUS_WAIT_MATCHING: 'wait-matching',
    GAME_STATUS_MATCH_FAIL: 'fail-match',
    GAME_STATUS_READY: 'ready',
    GAME_STATUS_DICE: 'dice',
    GAME_STATUS_PLAYING: 'playing',
    GAME_STATUS_ROLLED_DICE: 'rolled-dice',
    GAME_STATUS_ENDED: 'ended',
    GAME_STATUS_PAUSED: 'paused',
    GAME_STATUS_ROLL_ENABLE: 'enable',
    GAME_STATUS_ROLL_DISABLE: 'disable',
    GAME_STATUS_WAITING_MOVE_CHECKER: 'waiting-move',

    // double bet status
    DOUBLE_BET_NONE: 'none',
    DOUBLE_BET_REQUIRED: 'required',
    DOUBLE_BET_APPROVED: 'approved',
    DOUBLE_BET_REJECTED: 'rejected',

    // end reasons
    ENDED_NORMAL: 'normal',
    ENDED_ABANDON: 'abandon user',
    ENDED_FORCE_OUT: 'force out',
    ENDED_TIMEOUT: 'timeout',
    ENDED_ERROR: 'error',
    ENDED_CANCEL: 'cancel',

    // socket events
    EVENT_ERROR: 'socket-error',
    EVENT_CONNECT_USER: 'connect-user',
    EVENT_DISCONNECT_USER: 'disconnect-user',

    // names
    BASE_GAMENAME_BACKGAMMON: 'Backgammon',
    BASE_GAMENAME_POKER: 'Poker',

    // user status
    USER_STATUS_READY: 'user-ready',
    USER_STATUS_WAITING: 'user-waiting',
    USER_STATUS_ONLINE: 'user-online',
    USER_STATUS_OFFLINE: 'user-offline',
    USER_STATUS_ORDER: 'user-order',
    USER_STATUS_WAITER: 'user-waiter',

    // backgammon game events
    EVENT_VISIT_BACKGAMMON_LOBBY: 'visit-backgammon-lobby', // a user visit lobby page
    EVENT_CREATE_BACKGAMMON_GAME: 'create-backgammon-game', // a user create a game room
    EVENT_ANSWER_CREATE_BACKGAMMON_GAME: 'answer-create-backgammon-game', // answer to creator
    EVENT_JOIN_BACKGAMMON_GAME: 'join-backgammon-game', // a user join to a game room
    EVENT_ANSWER_JOIN_BACKGAMMON_GAME: 'answer-join-backgammon-game', // answer to joiner
    EVENT_CHANGE_WAITING_BACKGAMMON_ROOMS: 'change-waiting-backgammon-rooms', // changed backgammon rooms
    EVENT_CREATE_A_NEW_BACKGAMMON_ROOM: 'create-a-new-backgammon-room', // create a new waiting room
    EVENT_REMOVE_A_BACKGAMMON_ROOM: 'remove-a-backgammon-room', // remove a new waiting room
    EVENT_CANCELLED_CURRENT_BACKGAMMON_GAME: 'cancelled-current-backgammon-game', // cancelled current game
    EVENT_PREV_BACKGAMMON_GAME: 'prev-backgammon-game', // prev backgammon game is running yet or ended automatically
    EVENT_REQUEST_MY_BACKGAMMON_GAME: 'request-my-backgammon-game', // request my game status when prev game is running yet at reconnect
    EVENT_ANSWER_MY_BACKGAMMON_GAME: 'answer-my-backgammon-game', // answer of request my game
    EVENT_CAN_ROLL_DICE_BACKGAMMON: 'can-roll-dice-backgammon',
    EVENT_RECONNECT_USER_BACKGAMMON: 'reconnect-user-backgammon',
    EVENT_ANSWER_GAME_STATUS: 'answer_game_status_backgammon',
    EVENT_BACKGAMMON_GAME_LOAD: 'backgammon_game_load',
    EVENT_BACKGAMMON_GAME_LOAD_RESULT: 'backgammon_game_load_result',
    EVENT_FORCE_OUT_ROOM : 'force-out-backgammon',
    EVENT_CONNECT_TO_BACKGAMMON: 'connect-to-backgammon',

    EVENT_READY_TO_BACKGAMMON_PLAYING: 'ready-to-backgammon-play', // ready to playing game
    EVENT_BACKGAMMON_DICE_FIRST_ROLL: 'backgammon-dice-first-roll', // dice roll at first time
    EVENT_BACKGAMMON_DICE_GAME_ROLL: 'backgammon-dice-game-roll', // dice roll in playing game
    EVENT_BACKGAMMON_MOVE_CHECKER: 'backgammon-move-checker', // move checker
    EVENT_BACKGAMMON_ADMIN_CHEAT: 'backgammon-admin-cheat', // admin cheat
    EVENT_BACKGAMMON_ANSWER_ADMIN_CHEAT: 'backgammon-answer-admin-cheat', // answer about admin cheat
    EVENT_BACKGAMMON_REMAIN_TIME: 'backgammon-remain-time', // send remain time for auto play
    EVENT_BACKGAMMON_ABANDON: 'backgammon-game-abandon', // force out by user
    EVENT_BACKGAMMON_CHAT_MESSAGE: 'backgammon-chat-message', // chat message
    EVENT_BACKGAMMON_REQUEST_DOUBLE_BET: 'backgammon-request-double-bet', // request double bet
    EVENT_BACKGAMMON_ANSWER_DOUBLE_BET: 'backgammon-answer-double-bet', // answer-double-bet
    EVENT_BACKGAMMON_START_ROLL_DICE     : 'backgammon-start-roll-dice', // start roll dice
    EVENT_BACKGAMMON_RESULT_ROLL_DICE    : 'backgammon-result-roll-dice',
    EVENT_BACKGAMMON_START_PLAYING_DICE  : 'backgammon-start-playing-dice',
    EVENT_BACKGAMMON_RESULT_PLAYING_DICE : 'backgammon-result-playing-dice',
    EVENT_BACKGAMMON_RESULT_MOVE_CHECKER : 'backgammon-result-move-checker',
    EVENT_BACKGAMMON_END_GAME            : 'backgammon-end-game',
    EVENT_BACKGAMMON_NOTCONNECT_OPPONENT : 'backgammon-not-connect-opponent',

    // timeout constants
    TIMEOUT_AUTO_END_MISS_MATCH: 200 * 1000, // 20s : auto remove when any user not join from create a new game after 20 s.
    TIMEOUT_AUTO_END_MISS_READY: 5 * 1000, // 5s : auto end when any user not ready from match game after 5 s.
    TIMEOUT_AUTO_DICE_FIRST_ROLL: 3 * 1000, // 2s : auto first dice roll when user not dice manually for 3s
    
    TIMEOUT_AUTO_DICE           : 5000, // after 5s
    TIMEOUT_START_ROLLING       : 500, // after 0.5s
    TIMEOUT_ROLLING             : 1500, // after 1.5s
    TIMEOUT_NEXT_ROLL           : 500, // after 0.5s
    TIMEOUT_AUTO_ROLLING        : 1500, // after 1.5s
    TIMEOUT_AUTO_MOVE_CHECKER   : 25000, // after 25s
    TIMEOUT_AUTO_WIN            : 180000, // after 3min
    TIMEOUT_WAIT_USER           : 30000,  // after 30s
    TIMEOUT_START_PLAY          : 2000,
    TIMEOUT_ROOL_DICE           : 3000,
    
    // error constants
    ERROR_CANNOT_FIND_ROOM: 'Can not find room',
    
    ST_CONNECTED : 'connected',
    ST_NO_CONNECTED : 'no-connected'
};

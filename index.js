/**
 * A Bot for Slack!
 */


/**
 * Define a function for initiating a conversation on installation
 * With custom integrations, we don't have a way to find out who installed us, so we can't message them :(
 */

function onInstallation(bot, installer) {
    if (installer) {
        bot.startPrivateConversation({user: installer}, function (err, convo) {
            if (err) {
                console.log(err);
            } else {
                convo.say('I am a bot that has just joined your team');
                convo.say('You must now /invite me to a channel so that I can be of use!');
            }
        });
    }
}


/**
 * Configure the persistence options
 */

var config = {};
if (process.env.MONGOLAB_URI) {
    var BotkitStorage = require('botkit-storage-mongo');
    config = {
        storage: BotkitStorage({mongoUri: process.env.MONGOLAB_URI}),
    };
} else {
    config = {
        json_file_store: ((process.env.TOKEN)?'./db_slack_bot_ci/':'./db_slack_bot_a/'), //use a different name if an app or CI
    };
}

/**
 * Are being run as an app or a custom integration? The initialization will differ, depending
 */

if (process.env.TOKEN || process.env.SLACK_TOKEN) {
    //Treat this as a custom integration
    var customIntegration = require('./lib/custom_integrations');
    var token = (process.env.TOKEN) ? process.env.TOKEN : process.env.SLACK_TOKEN;
    var controller = customIntegration.configure(token, config, onInstallation);
} else if (process.env.CLIENT_ID && process.env.CLIENT_SECRET && process.env.PORT) {
    //Treat this as an app
    var app = require('./lib/apps');
    var controller = app.configure(process.env.PORT, process.env.CLIENT_ID, process.env.CLIENT_SECRET, config, onInstallation);
} else {
    console.log('Error: If this is a custom integration, please specify TOKEN in the environment. If this is an app, please specify CLIENTID, CLIENTSECRET, and PORT in the environment');
    process.exit(1);
}

//from user:garymoon https://github.com/howdyai/botkit/issues/261
function start_rtm() {
  bot.startRTM(function(err,bot,payload) {
    if (err) {
      console.log('Failed to start RTM');
      return setTimeout(start_rtm, 60000);
    }
    console.log("RTM started");
  });
}

/**
 * A demonstration for how to handle websocket events. In this case, just log when we have and have not
 * been disconnected from the websocket. In the future, it would be super awesome to be able to specify
 * a reconnect policy, and do reconnections automatically. In the meantime, we aren't going to attempt reconnects,
 * WHICH IS A B0RKED WAY TO HANDLE BEING DISCONNECTED. So we need to fix this.
 *
 * TODO: fixed b0rked reconnect behavior
 */
// Handle events related to the websocket connection to Slack
controller.on('rtm_open', function (bot) {
    console.log('** The RTM api just connected!');
});

controller.on('rtm_close', function (bot,err) {
    console.log('conntion failed/errored, trying to reopen')
    // you may want to attempt to re-open
    start_rtm();
});

controller.on('rtm_close', function (bot) {
    console.log('** The RTM api just closed');
    // you may want to attempt to re-open
});

/**
 * Core bot logic goes here!
 */
// BEGIN EDITING HERE!

var old_msg = {
  "type": "message",
  "channel": "",
  "user": "",
  "text": "This is a test message for now!",
  "ts": "0000000000.000000",
  "team": "",
  "event": ""
};

var time_diff_string = "";
var reply_string = "Hello!";

function check_for_new_msg(message) {
  if (message.ts !== "0000000000.000000")
    return true;
  return false;
}

function parse_msg(message) {
  if (check_for_new_msg(message))
   console.log(message.text, message.ts);
}

function find_time_difference(old_msg, new_msg) {
  if (check_for_new_msg(old_msg) && check_for_new_msg(new_msg)) {
    var tada = parseFloat(new_msg.ts) - parseFloat(old_msg.ts);
    var time_gone = calculate_time_elapsed(tada);
    console.log(typeof time_gone);
    time_gone = time_gone.toString();
    //console.log(time_gone);
    return time_gone;
  }
}

function calculate_time_elapsed(time) {
  if (typeof time === "number") {
    var time_d = time/86400; //conversion for number of days in time
    var day_h = 86400/360; //conversion for number of hours in days remainder
    var hour_m = 360/60; //conversion for number of minutes in hours remainder
    var min_s = 60; //conversion for number of seconds in minutes remainder

    var days = Math.floor(time_d);
    var hours = Math.floor((time_d - days) * day_h);
    var minutes = Math.floor(((time_d - days) * day_h - hours) * hour_m);
    var seconds = Math.floor((((time_d - days) * day_h - hours) * hour_m - minutes) * min_s);

    var time_difference = "total seconds since last hello:"+time.toString()+" days:"+days.toString()
      +" hours:"+hours.toString()+" minutes:"+minutes.toString()+" seconds:"+seconds.toString();
    //console.log(time_difference);
    return time_difference;
  }
}

controller.on('bot_channel_join', function (bot, message) {
    bot.reply(message, "I'm here!")
});

controller.hears('hello', ['direct_message','ambient'], function (bot, message) {
    if (check_for_new_msg(old_msg)) {
      parse_msg(old_msg);
      parse_msg(message);
      time_diff_string = find_time_difference(old_msg, message);
      console.log(time_diff_string);
      bot.reply(message, time_diff_string);
    } else {
      bot.reply(message, reply_string);
    }
    //bot.reply(message, dohoho);
    old_msg = message;

});

controller.hears(['server outage urgent','server down urgent'], ['ambient'], function (bot, message) {
    console.log(message.text);
    bot.reply(message, 'Oh no! The servers are down again');
});

controller.hears(['at here','@here'], ['ambient'], function (bot, message) {
    console.log(message.text);
    bot.reply(message, 'Yet another misuse of @here');
});


/**
 * AN example of what could be:
 * Any un-handled direct mention gets a reaction and a pat response!
 */
//controller.on('direct_message,mention,direct_mention', function (bot, message) {
//    bot.api.reactions.add({
//        timestamp: message.ts,
//        channel: message.channel,
//        name: 'robot_face',
//    }, function (err) {
//        if (err) {
//            console.log(err)
//        }
//        bot.reply(message, 'I heard you loud and clear boss.');
//    });
//});

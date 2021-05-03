const fetch = require('node-fetch');
const Twit = require('twit');

const IKON_VACCINE_API_URL = 'https://ikon.mn/api/json/vaccine';

const {
  ACCESS_TOKEN: access_token,
  ACCESS_TOKEN_SECRET: access_token_secret,
  CONSUMER_KEY: consumer_key,
  CONSUMER_SECRET: consumer_secret,
} = process.env;

if (!access_token || !access_token_secret || !consumer_key || !consumer_secret) {
  throw new Error('No environment variable set');
}

const Twitter = new Twit({
  consumer_key,
  consumer_secret,
  access_token,
  access_token_secret,
});

const BAR_STYLE = '⣀⣄⣤⣦⣶⣷⣿';
const DOSES = ['progress', 'completed'];
const NAMES = {
  completed: '🥈 💉',
  progress: '🥇 💉',
};

const MAX_SIZE = 20,
  MIN_SIZE = 20;

module.exports = async (req, res) => {
  try {
    const token = req?.headers['x-mnvaccinetracker-key'];

    // Compare tokens

    if (access_token.localeCompare(token) !== 0) {
      console.log('Not authorized');
      res.status(401).end('Not authorized');
    }

    // Fetch data from ikon
    console.log('Fetching data from ikon');
    const json = await (await fetch(IKON_VACCINE_API_URL)).json();

    const { target } = json;

    // Build a status text
    let status = '';

    if (json?.completed === target) {
      // Yay, fully vaccinated.
      status = 'We, Mongolians, have reached the target of fully vaccinated people. 🎉🥳👏';
    } else {
      DOSES.forEach((dose) => {
        let percentage = (json[dose] / target) * 100;
        let bar = makeBar(percentage).padEnd(20, BAR_STYLE[0]);
        status += `${NAMES[dose]} ${bar} ${percentage.toFixed(1)}%\n`;
      });
    }

    Twitter.post(
      'statuses/update',
      {
        status,
      },
      (err) => {
        if (err) {
          res.status(400).end('An error occured');
        }

        res.status(200).end('Tweeted successfully. See more at https://twitter.com/mnvaccinecount');
      }
    );
  } catch (e) {
    console.log(e.mesage);
    res.status(400).end(e.message);
  }
};

// Taken from https://github.com/Changaco/unicode-progress-bars/blob/master/generator.html#L60
function makeBar(p) {
  let d,
    full,
    m,
    middle,
    r,
    rest,
    x,
    min_delta = Number.POSITIVE_INFINITY,
    full_symbol = BAR_STYLE[BAR_STYLE.length - 1],
    n = BAR_STYLE.length - 1;

  if (p >= 100) return repeat(full_symbol, MAX_SIZE);

  p /= 100;

  for (let i = MAX_SIZE; i >= MIN_SIZE; i--) {
    x = p * i;
    full = Math.floor(x);
    rest = x - full;
    middle = Math.floor(rest * n);
    if (p != 0 && full == 0 && middle == 0) middle = 1;
    d = Math.abs(p - (full + middle / n) / i) * 100;
    if (d < min_delta) {
      min_delta = d;
      m = BAR_STYLE[middle];
      if (full == i) m = '';
      r = repeat(full_symbol, full) + m + repeat(BAR_STYLE[0], i - full - 1);
    }
  }
  return r;
}

function repeat(s, i) {
  let r = '';
  for (let k = 0; k < i; k++) r += s;
  return r;
}

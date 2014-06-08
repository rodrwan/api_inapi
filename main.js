var express    = require('express'),
    bodyParser = require('body-parser'),
    request    = require('request'),
    morgan     = require('morgan'),
    timeout    = require('connect-timeout'),
    _          = require('underscore');


var app = express();

app.use(express.static(__dirname + '/public'));   // set the static files location /public/img will be /img for users
app.use(morgan('dev'));           // log every request to the console
app.use(bodyParser());            // pull information from html in POST
app.use(timeout(30000000));
// app.use(methodOverride());          // simulate DELETE and PUT

var env = process.env.NODE_ENV || 'development';
if ('development' == env) {
   // configure stuff here
}

var router = express.Router();

/*

  GLOBAL VARIABLES

*/
var REQUEST_STACK = [];
var ID_STACK = [];
var STACK_COUNT = 0;
var count = {};
var start;

/*
 * Main method, below you can find some others methods to handle the syncronous tasks.
 * This route is the main route of the API.
 */
router.get('/inapi/:brand', timeout(300000), haltOnTimedout, function(req, response) {
  start = process.hrtime();
  var brand = req.params.brand;
  REQUEST_STACK = [];
  count = {
      disponible: true,
      concedidas: 0,
      concedidasDist: 0,
      enTramite: 0,
      enTramiteDist: 0,
      caducado: 0,
      rechazadas: 0,
      vencidas: 0,
      desistidas: 0,
      anuladas: 0,
      indefinido: 0
    };
  console.log(brand)
  var formData = {
    "LastNumSol": "0", "param1": "", "param2": "", "param3": brand,
    "param4": "", "param5": "", "param6": "", "param7": "", "param8": "", "param9": "",
    "param10": "", "param11": "", "param12": "", "param13": "", "param14": "", "param15": ""
  };
  var opts = {
    'url': 'http://ion.inapi.cl:8080/Marca/BuscarMarca.aspx/FindMarcas',
    'body': JSON.stringify(formData),
    'headers': {
      'followRedirect': true,
      'User-Agent': '',
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest'
    }
  };

  request.post(opts, function (err, res, body) {
    if (!err && res.statusCode === 200) {
      var jBody = JSON.parse(body);
      var result = JSON.parse(jBody['d']);
    }

    if (result.length === 0) {
      response.json(count);
    } else {
      count.disponible = false;
      result = _.pluck(result, 'id');

      ID_STACK = _.union(ID_STACK, result);
      STACK_COUNT = ID_STACK.length;

      var resultCount = result.length;
      var end = _.last(result);

      if (resultCount === 20) {
        reRequest(end, brand, response);
      } else {
        generateRequest(response, brand);
      }
    }
  });
});

router.get('/inapi/', function(req, res) {
  var obj = {
    'status': 'error',
    'message': 'you need to give the brand name',
    'example': 'http://localhost/inapi/la%20preferida'
  };
  res.json(obj);
});
router.get('/inapi', function(req, res) {
  var obj = {
    'status': 'error',
    'message': 'you need to give the brand name',
    'example': 'http://localhost/inapi/la%20preferida'
  };
  res.json(obj);
});

function haltOnTimedout(req, res, next){
  if (!req.timedout) next();
}

/*
 *
 */
var supervisor = function () {
  if (!finishedRequest)
    return;


};

/*
 * Please do magic
 */
var syncRequests = function (response, brand) {
  var opts = REQUEST_STACK.shift();
  var binded = processResponse.bind({'response': response, 'brand': brand});
  request.post(opts, binded);
};

/*
 * Generate the data for next request, this method is for syncronous task schedule.
 */
var generateRequest = function (response, brand) {
  var stop = ID_STACK.length;

  _.each(ID_STACK, function (data, idx) {
    var formData = {
      'numeroSolicitud': data
    };
    var opts = {
      'url': 'http://ion.inapi.cl:8080/Marca/BuscarMarca.aspx/FindMarcaByNumeroSolicitud',
      'body': JSON.stringify(formData),
      'headers': {
        'followRedirect': true,
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'User-Agent': '',
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest'
      }
    };
    REQUEST_STACK.push(opts);
    // if (idx === stop-1) {
      syncRequests(response, brand);
    // }
  });
};

/*
 * Recursive method, this method extract the ids of coincidense for the brand we are looking for.
 */
var reRequest = function (end, brand, response) {
  var formData = {
    "LastNumSol": end, "param1": "", "param2": "", "param3": brand,
    "param4": "", "param5": "", "param6": "", "param7": "", "param8": "", "param9": "",
    "param10": "", "param11": "", "param12": "", "param13": "", "param14": "", "param15": ""
  };
  var opts = {
    'url': 'http://ion.inapi.cl:8080/Marca/BuscarMarca.aspx/FindMarcas',
    'body': JSON.stringify(formData),
    'headers': {
      'followRedirect': true,
      'User-Agent': '',
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest'
    }
  };
  request.post(opts, function (err, res, body) {
    if (!err && res.statusCode === 200) {
        var jBody = JSON.parse(body);
        var result = JSON.parse(jBody['d']);
    }
    result = _.pluck(result, 'id');
    ID_STACK = _.union(ID_STACK, result);
    resultCount = result.length;
    end = _.last(result);
    if (resultCount < 20) {
      STACK_COUNT = ID_STACK.length;
      return generateRequest(response, brand);
    } else {
      return reRequest(end, brand, response);
    }
  });


};
/*
 * Process the final response and count the coincidense for different class of inapi's brand.
 */
var processResponse = function (err, res, body) {
  var that = this;
  var response = that.response;
  var brand = that.brand;
  if (!err && res.statusCode === 200) {
    jBody = JSON.parse(body);
    result = JSON.parse(jBody['d']);

    if (('Estado' in result) && ('Denominacion' in result)) {
      if ( result['Estado'] === 'C' && result['Denominacion'] === brand.toUpperCase() ) {
        count.concedidas += 1;
      } else if ( result['Estado'] === 'C' && result['Denominacion'] !== brand.toUpperCase() ) {
        count.concedidasDist += 1;
      }

      if ( result['Estado'] === ' ' && result['Denominacion'] === brand.toUpperCase() ) {
        count.enTramite += 1;
      } else if ( result['Estado'] === ' ' && result['Denominacion'] !== brand.toUpperCase() ) {
        count.enTramiteDist += 1;
      }

      if (result['Estado'] === 'U') {
        count.caducado += 1;
      } else if (result['Estado'] === 'N') {
        count.rechazadas += 1;
      } else if (result['Estado'] === 'V') {
        count.vencidas += 1;
      } else if (result['Estado'] === 'D') {
        count.desistidas += 1;
      } else if (result['Estado'] === 'A') {
        count.anuladas += 1;
      } else if (result['Estado'] === 'P') {
        count.indefinido += 1;
      }
    }
    STACK_COUNT--;

    if (STACK_COUNT === 0) {
      console.log('Finish time: ' + process.hrtime(start)[0] + 's');
      console.log('Extracting info done!');
      response.json(count);
    } else {
      syncRequests(response, brand);
    }
  }
};

// apply the routes to our application
app.use('/', router);

var port = Number(process.env.PORT || 5000);
app.listen(port);
console.log('Magic happens on port: ' + port);

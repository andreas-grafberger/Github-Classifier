console.log("Frontend started..");
let stateView, inputView, classificatorView, outputView, wrapperView,
	stateData = {
		action: "halt",
		mode: "stream", // pool, test, single
		isSemiSupervised: false,
		trainInstantly: false,
		formula: "",
		formulas: []
	},
	inputData = {
		type: stateData.mode,
		repoName: "Repository Name",
    repoAPILink: "",
    classifiersUnsure: false,
    semisupervised: {"SemiSupervisedSureEnough" : true, "SemiSupervisedLabel": "None"},
    classifierAsking: "",
		poolSize: 0
	},
	classificatorData = {
    isPrediction: true,
		classificators: [] // {name, description, yield, active, result}
	},
	outputData = {},
	wrapperData = {
		current: {name: "", description: "", yield: 0, active: false, result: {}},
    savePoints: [],
		id: 0
	};

try{
	runGenerator(function *main(){
		let initData = yield jQGetPromise("/get/classificators", "json");
    classificatorData.classificators = initData.classificators;
		initVue();
	});
}catch(ex){
	console.log(ex);
}

function getStateQuery(){
	let query = "?";
	var keys = Object.keys(stateData);
	for(var i = 0; i < keys.length; i++){
	  if(typeof(stateData[keys[i]]) == "string" || typeof(stateData[keys[i]]) == "boolean")
	  	query += keys[i] + "=" + encodeURIComponent(stateData[keys[i]]) + "&";
	}
	return query;
}

function initVue(){
  // Init Vue components (state, input, classificators, output)
  assert(typeof(Vue) != "undefined", "Vue script missing");
  stateView = new Vue({
    el: '#header',
    data: stateData,
    methods:{
    	getFormulas: function(){
    		$.get("/get/formulas", function(result){
    			result = JSON.parse(result);
    			if(result === false)
    				throw new Error("Invalid server response");
    			stateData.formulas = result;
    			if(result.length > 0)
    				stateData.formula = result[0];
    		});
    	},
    	setFormula: function(f){
    		assert(isNotEmpty(f) && stateData.formulas.indexOf(f) >= 0, "Formula should not be empty");
    		stateData.formula = f;
    	},
      switchMode: function(){
        classificatorData.isPrediction = stateData.mode == 'test';
      },
		  singleStep: function(){
  			stateData.action = "singleStep";
  			console.log("Proceeding single step");
        runGenerator(function *main(){
          // Fetch sample, display
          inputData.repoName = "Searching..";
          results = yield jQGetPromise("/get/doSingleStep"+getStateQuery(), "json");
          stateView.updateResults(results);
        });
  		},
  		halt: function(){
  			stateData.action = "halt";
  			console.log("Halting");
        state.action = "halt";
  		},
  		loop: function(){
  			stateData.action = "loop";
  			console.log("Looping");
  			runGenerator(function *main(){
  				// Fetch sample, display then repeat until stateData has changed
  				while(stateData.action == "loop"){
            inputData.repoName = "Searching..";
  					results = yield jQGetPromise("/get/doSingleStep"+getStateQuery(), "json");
  					stateView.updateResults(results);
  					// To remove
  					stateData.action = "halt";
  				}
  			});
  		},
  		updateResults: function(results){
        // Apply returned changes to the internal GUI state
        assert(results != null && typeof(results.repo) != "undefined" && typeof(results.classificatorResults) != "undefined", "Result is not well-formatted.");
        inputData.repoName = results.repo.repoName;
        inputData.repoAPILink = results.repo.repoAPILink;
        if(stateData.mode == "stream"){
          inputData.classifiersUnsure = results.classifiersUnsure;
          inputData.semisupervised = results.semisupervised;
          if(results.classifiersUnsure)
            window.open("/user_classification.html?popup=true&api-url="+results.repo.repoAPILink, "User decision", "channelmode=yes");
        }else if(stateData.mode = "pool"){
          inputData.classifierAsking = results.classifierAsking;
        }
        let res = results.classificatorResults;
				for(let c in classificatorData.classificators){
          let local = classificatorData.classificators[c];
          if(typeof(res[local.name] != "undefined")){
            // Classificator is not muted, update it's results
  						local.result = res[local.name];
          }
  			}
  		},
      predictSingle: function(){
        let repoLink = prompt("Please insert the link to a repository you wish to classify.");
        if(repoLink){
          runGenerator(function *main(){
            // Fetch sample, display
            results = yield jQGetPromise("/get/PredictSingleSample?repoLink="+repoLink, "json");
            stateView.updateResults(results);
          });
        }
      },
      startTest: function(){
        runGenerator(function *main(){
          // Fetch sample, display
          results = yield jQGetPromise("/get/startTest", "json");
          classificatorView.updateResults(results);
        });
      }
    }
  });
  stateView.getFormulas();

  titleView = new Vue({
    el: '#titles',
    data: stateData
  });

  inputView = new Vue({
    el: '#input',
    data: inputData,
    methods:{
      switchMode: function(type){

      },
      getPoolsize: function(){
        $.get("/get/poolSize", function(result){
          if(isNaN(result))
            throw new Error("Invalid server response");
          inputData.poolSize = parseInt(result);
        });
      }
    }
  });
  inputView.getPoolsize();


  classificatorView = new Vue({
    el: '#classificators',
    data: classificatorData,
    methods:{
    	showInfo: function(id){
    		wrapperView.setData(id);
        wrapperView.getSavePoints();
    		$('.overlay_blur').fadeIn();
    		$('#overlay_wrapper').fadeIn();
    	},
    	switchState: function(id){
    		classificatorData.classificators[id].active = !classificatorData.classificators[id].active;
    	},
    	getMax: function(id){
    		let max = 0;
    		for(let i = 0; i < classificatorData.classificators[id].result.length; i ++){
    			max = Math.max(max, classificatorData.classificators[id].result[i].val);
    		}
    		return max;
    	},
      updateSaveState: function(name, yield, classificatorResults){
        for(let i in classificatorData.classificators){
          let c = classificatorData.classificators[i];
          if(c.name == name){
            c.yield = yield <= 1 ? yield : yield/100;
            c.result = classificatorResults;
          }
        }
      }
    }
  });

  outputView = new Vue({
    el: '#output',
    data: outputData,
    methods:{
  		switchMode: function(type){

  		}
    }
  });

  wrapperView = new Vue({
    el: '#overlay_wrapper',
    data: wrapperData,
    methods:{
    	setData: function(i){
    		wrapperData.current = classificatorData.classificators[i];
    	},
      getSavePoints: function(){
        $.get("/get/savePoints?name="+wrapperData.current.name, function(result){
          if(result != ""){
            result = JSON.parse(result);
            if(result === false)
              throw new Error("Invalid server response");
            wrapperData.savePoints = result;
          }
        });
      },
  		retrain: function(){
  			console.log("Wrapper: "+wrapperData.current.name+" retraining.");
        runGenerator(function *main(){
          results = yield jQGetPromise("/get/retrain?name="+wrapperData.current.name, "json");
          notify("Retrained", "The classifier "+wrapperData.current.name+" has been retrained.", 2500);
        });
  		},
  		retrain_semi: function(){
  			console.log("Wrapper: "+wrapperData.current.name+" semi retraining.");
        runGenerator(function *main(){
          results = yield jQGetPromise("/get/retrainSemiSupervised?name="+wrapperData.current.name, "json");
          notify("Retrained", "The classifier "+wrapperData.current.name+" has been retrained with semi-supervised data.", 2500);
        });
  		},
  		save: function(){
  			console.log("Wrapper: "+wrapperData.current.name+" saving.");
        runGenerator(function *main(){
          results = yield jQGetPromise("/get/save?name="+wrapperData.current.name, "json");
          wrapperView.getSavePoints();
          notify("Saved", "The classifier "+wrapperData.current.name+" has been saved.", 2500);
        });
  		},
  		load: function(){
  			console.log("Wrapper: "+wrapperData.current.name+" loading.");
        runGenerator(function *main(){
          result = yield jQGetPromise("/get/load?name="+wrapperData.current.name, "json");
          // result contains a name of the selected classificator and an accuracy array
          classificatorView.updateSaveState(result.name, result.yield, result.classificatorResults);
          notify("Saved", "The classifier "+wrapperData.current.name+" has been loaded.", 2500);
        });
  		}
    }
  });
}

function hideInfo(){
	// Hide any visible popup
	$('#overlay_wrapper').fadeOut();
	$('.overlay_blur').fadeOut();
}

function HandlePopupResult(result) {
  // If the sample has been labeled, update view
  console.log("result of popup is: " + result);
  $.get("/get/ALclassification?api-url="+result.api-url+"&label="+result.label, function(result){

  });
}

function jQGetPromise(url, datatype = ""){
  // Promise for $.get 
  assert(isNotEmpty(url), "URL missing");
  return new Promise(function(resolve, reject){
    $.get(url, function(data){resolve(data)},datatype)
    .fail(function(data){
      reject("Error getting data from url " + url);
    });
  }).then(function(data){
    return data;
  });
}

function runGenerator(g) {
  //A simple ES6 runGenerator, handling tasks
  var it = g(), ret;
  var result = it.next();
  // asynchronously iterate over generator
  (function iterate(val){
    if (!result.done) {
      // poor man's "is it a promise?" test
      if ("then" in result.value) {                
        // resolve to a promise to make it easy
        let promise = Promise.resolve(result.value);
        promise.then(function(value) {
          result = it.next(value);
          iterate();
        }).catch(function(error) {
          console.log("Generator caught an error: " + error);
          result = it.next(null);//it.throw("Generator caught an error: " + error);
          iterate();
        });
      }
      // immediate value: just send right bk in
      else {
        // avoid synchronous recursion
        setTimeout( function(){
          iterate( result.value );
        }, 0 );
      }
    }
  })();
}

function assert(condition, message) {
  // Throw error if condition is not true  
  if (!condition) {
      message = message || "Assertion failed";
      if (typeof Error !== "undefined") {
          throw new Error(message);
      }
      throw message; // Fallback
  }
}

function isNotEmpty(str){
  // Checks if str is not empty and not null
  return !isEmpty(str);
}

function isEmpty(str) {
  // Checks if str is empty or null
  return (!str || 0 === str.length);
}

function notify(title, note, duration = 1000){
  //Prompts a browser notification and/or requests permission to do
  var got_permission = false;
  if ("Notification" in window) {
    if (Notification.permission === "granted") {
      got_permission = true;
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission((permission) => {
        if (permission === "granted")
          got_permission = true;
      });
    }
  }
  if(got_permission){
      title = title === "" ? getString('notif_title') : title;
      let options = {
          body: note,
          icon: '/images/sheep_logo.png',
      };
      let notification = new Notification(title, options);
      setTimeout(notification.close.bind(notification), duration); 
  }
}

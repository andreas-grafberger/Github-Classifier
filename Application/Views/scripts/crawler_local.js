
/*
  ##########################################
  # JS script to classify samples manually #
  ##########################################
  Author: Michael Leimstädtner
  JQuery has to be accessible
  */
 
 // Global variables
 var qS = (query) => document.querySelector(query),
     converter = new showdown.Converter(), // display markdown
     liveView, buttons, // vue objects
     postData, allRepos = [], // fetching objects + stacks
     repoData = {
      author: "",
      user_url: "",
      name: "",
      url: "",
      stars: "",
      watchers: "",
      forks: "",
      language: "",
      description: "",
      commit_author: "",
      tagger: getParameterByName("popup") == "true" ? "" : get_name_tag(),
      commit_msg: "",
      files: "",
      readme: ""
    },
    server = "http://localhost:800/";

// Startup
try {
  console.log("Repocrawler started");
  initButtons();
  initVue();
  if(getParameterByName("popup") == "true"){
    addCustomRepo(getParameterByName("api_url"));
  }else{
    //getRepos();
    //updateClassifications();
    //sampleMining();
  }
}catch(ex){
  console.log(ex);
}

function updateClassifications(){
  // Ask the server if there are old samples that need to be reclassified
  $.get(server+"ajax.php?key=api:to-reclassify").then(function(result){
    result = JSON.parse(result);
    if(!result.success){
      // Maybe out of old classifications
      console.log(result.Error);
    }else{
      console.log(result);
      $.get(server+"ajax.php?key=api:generate_sample&class="+result.class+"&api_url=" + result.url.replace("https://github.com/", "https://api.github.com/repos/"), function(res2){
        if(res2 != "")
          res2 = JSON.parse(res2);
        console.log(res2);
        if(!res2.success){
          // Maybe out of old classifications
          console.log(res2.Error);
        }else{
          setTimeout(updateClassifications, 10000);
        }
      });
    }
  });
}

function sampleMining(){
  // Requests the server to generate a random unlabeled sample. Once finished, request the next until no more API calls are available
  console.log("Mining unlabeled sample");
  $.get(server+"ajax.php?key=api:generate_sample").then(function(result){
    if( result != ""){
      result = JSON.parse(result);
      // Maybe out of old classifications
      if(typeof(result.Error) != "undefined"){
        console.log(result.Error);
        // Keep mining, but wait 5 minutes (API calls may be over)
        setTimeout(sampleMining, 300000);
      }else
        setTimeout(sampleMining, 1000);
    }else{
      setTimeout(sampleMining, 1000);
    }
  });
}

function getRepos(){
  // Goes through a random list of repos and, if it fits our needs, adds them to a list
  console.log("Getting repos..");
  tryNextIteration();

  runGenerator(function *main(){
    // Add pending repos to list
    let repo = yield jQGetPromise(server+'ajax.php?key=api:single&table=to_classify', "json");
    if(typeof(repo.Error) == "undefined"){
      allRepos.push(repo);
      initialized = true;
    }else{
      notify(repo.Error, "There is no sample that needs to be classified.", 4000);
      //yield jQGetPromise(server+"ajax.php?key=api:generate_sample", "json");
      //setTimeout(getRepos, 5000);
    }
    console.log("UNLABELED repos: ");
    console.log(allRepos);
  });
}

function addCustomRepo(api_url){
  // Add a custom repository to the list. Must be part of the unlabeled table
  if(api_url != ""){
    runGenerator(function *main(){
      // Add pending repos to list
      //yield jQGetPromise(server+"ajax.php?key=api:generate_sample&api_url="+api_url, "json");
      let res = yield jQGetPromise(server+"ajax.php?key=api:to_classify&filter="+btoa("api_url=" + api_url), "json");
      if(res == "" || !res.success || res.data.length == 0){
        throw new Error("There is no such sample.");
      }
      let repo = res.data[0];
      allRepos.push(repo);
      tryNextIteration();
      initialized = true;
      //}else{
        //notify(repo.Error, "There is no sample that needs to be classified.", 4000);
        //yield jQGetPromise(server+"ajax.php?key=api:generate_sample", "json");
        //setTimeout(getRepos, 5000);
      //}
    });
  }
}

function tryNextIteration(){
  // Display current repository
  // If a preloaded repo is ready, remove it from the list and visualize it
  if(allRepos.length > 0){
    runGenerator(function *main(){
      let repo = allRepos.shift();
      console.log("Iteration started with repo:");
      console.log(repo);
      try{
        // Update Page
        repoData = {
          author: repo.author,
          user_url: "https://github.com/"+repo.author,
          name: repo.name,
          url: repo.url,
          stars: repo.stars,
          watchers: repo.watches,
          forks: repo.forks,
          language: repo.language_main,
          description: repo.description,
          commit_author: "",
          commit_msg: "",
          files: getTree("tree", repo.folders.split(" ")) + getTree("blob", repo.files.split(" ")),
          readme: converter.makeHtml(atob(repo.readme)),
          tagger: repoData.tagger
        };
        postData = {
          id: repo.id,
          tagger: repoData.tagger
        }

        updateVue();
      }catch(ex){
       /* skipRepo(repo.url);
        setTimeout(tryNextIteration, 50);*/
        console.log("iteration halted:");
        console.log(ex);
      }
    });
  }else{
    console.log("No repository fits our needs.");
    setTimeout(tryNextIteration, 50);
  }
}
function getTree(type, fileNames){
  // Returns a html string containing a file and folder representation
  assert(isNotEmpty(type), "Type missing");
  let r = "";
  for(let i = 0; i < fileNames.length; i++)
    if(fileNames[i].trim() != "")
      r+= '<div title="'+type+'" class="col-xs-12 '+type+'">\
            <div class="col-xs-12">'+fileNames[i]+'</div>\
            <div class="col-xs-0"></div>\
            <div class="col-xs-0"></div>\
        </div>';
  return r;
}
function initVue(){
  // Init Buttons and Git preview
  assert(typeof(Vue) != 'undefined', "Vue library not found");
  initButtons();
  liveView = new Vue({
    el: '#githubContent',
    data: repoData
  });
}
function updateVue(){
  // Update/Rerender every vue property
  for(let key in repoData)
    liveView[key] = repoData[key];
  $("#loading").fadeOut('fast', function() {
    $("#githubContent").fadeIn('fast');
  });
}
/* Following: Button handling functions */
function handleButton(btn) {
  // Handle clicks on the buttons to the right. Either classify or skip repository
  if(Object.keys(repoData).length > 0){
    $("#githubContent").fadeOut('fast', function() {
      $("#loading").fadeIn('fast');
    });
    if($(btn).data("type") == "classify")
      classify($(btn).data("label"));
    else
      skipRepo();
  }else{
    notify("Status", "No repository is selected.")
  }
}
function classify(label, data = {}){
  // Save current visible repository with the selected CLASS label
  assert(isNotEmpty(label), "Invalid label");

  if(getParameterByName("popup") == "true"){
    // Close windows with response
    try {
        window.opener.HandlePopupResult({"skipped": false, "api_url" : getParameterByName("api_url"), "label" : label});
    }catch (err) {}
    window.close();
    return false;
  }else{
    postData.key = "classify";
    postData.class = label;
    postData.table = "to_classify";
    console.log(postData);
    $.post(server+"ajax.php", postData).then(
      function(result){
        if(result.indexOf("Repository classified") >= 0){
          notify("Status", "Classification submitted.");
        }else{
          notify("Status", "There was an error while trying to submit ("+result+").");
        }
          // Keep at least three repos buffered + get next liveView
          getRepos();
    });
  }
}
function skipRepo(){
  // Skip current visible repository and fetch next one
  if(getParameterByName("popup") == "true"){
    try {
        window.opener.HandlePopupResult({"skipped": true, "api_url" : getParameterByName("api_url"), "label" : "SKIPPED"});
    }catch (err) {}
    window.close();
  }else{
    assert(isNotEmpty(postData.id), "Invalid repository ID");
    $.post(server+"ajax.php", {key: "skip", id: postData.id}).then(
      function(result){
        notify("Status", "Classification skipped.");
        // Keep at least three repos buffered + get next liveView
        getRepos();
    });
  }
}
function initButtons(){
  // Display the classification buttons on the right side of the screen
  assert(typeof(Vue) != 'undefined', "Vue library not found");
   buttons = new Vue({
    el: '#buttons',
    components: {
      'cbutton': {
        props: ['vclick', 'vtitle', 'vname'],
        template: '<div><a v-bind:data-label="vname" v-bind:data-type="vclick" onClick="handleButton(this)" :title="vtitle">{{ vname }}</a></div>',
        methods: {
        },
        data: function(){
          return {
            count: getCount(this.vname)
          };
        }
      }
    }
  });
}

function getCount(className){
  // Returns the amount of existing samples for a given class
  assert(isNotEmpty(className), "Classname missing");
  if(className.toLowerCase() == "skip")
    return "";
  let timestamp = localStorage.getItem("count_timestamp"),
      counts = localStorage.getItem("class_count");
  if(timestamp == null || parseInt(timestamp) + 1000 * 10 < $.now()){
    localStorage.setItem("count_timestamp", $.now());
    jQGetPromise(server+"ajax.php?key=api:class-count&tagger="+repoData.tagger, "json").then(function(result){
      localStorage.setItem("class_count", JSON.stringify(result));
    });
  }
  if(counts != null){
    counts = JSON.parse(counts);
    for(let i = 0; i < counts.length; i++)
      if(counts[i]["class"] == className)
        return counts[i]["count"];
  }
  return 0;
}

function get_name_tag(){
  // Requires a name tag from every user
  let name_tag = localStorage.getItem("name_tag");
  if(name_tag == null){
    name_tag = prompt("Please insert your name tag").trim().toLowerCase();
    assert(isNotEmpty(name_tag), "Invalid name tag");
    localStorage.setItem("name_tag", name_tag);
  }
  return name_tag;
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
      // immediate value: just send right back in
      else {
        // avoid synchronous recursion
        setTimeout( function(){
          iterate( result.value );
        }, 0 );
      }
    }
  })();
}

function generalPromise(f, ...params){
  // Converts a function into a simple Promise
  return new Promise( function(resolve, reject){
    let fnc = params.length > 0 ? f.bind(f, params, resolve) : f.bind(f, resolve);
    fnc();
  }).then(function(text=""){
    return text;
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

function getParameterByName(name, url) {
    // retrieving query string values
    if (!url)
      url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

if (!String.prototype.trim) {
    (function() {
        // Make sure we trim BOM and NBSP
        var rtrim = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g;
        String.prototype.trim = function() {
            return this.replace(rtrim, '');
        };
    })();
}
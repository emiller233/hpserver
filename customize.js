/* Tile Customizer Editor for HousePanel
 * 
 * written by Ken Washington @kewashi on the forum
 * Designed for use only with HousePanel for Hubitat and SmartThings
 * (c) Ken Washington 2017, 2018, 2019
 */

// TODO - rewrite to not use global allthings and options arrays

// globals used by this module
cm_Globals.currentidx = "clock|clockdigital";
cm_Globals.id = null;
cm_Globals.usertext = "";
cm_Globals.reload = false;
cm_Globals.thingindex = null;
cm_Globals.thingidx = null;
cm_Globals.defaultclick = "name";
var ENABLERULES = true;

function getDefaultSubids() {
    var thingindex = cm_Globals.thingindex;
    var options = cm_Globals.options;
    var indexoptions = options.index;
    // var keys = Object.keys(indexoptions);
    var idx = cm_Globals.thingidx;
    
    // $.each(keys, function(index, val) {
    $.each(indexoptions, function(index, val) {
        if ( val.toString() === thingindex ) {
            idx = index;
            cm_Globals.thingidx = idx;
            return false;
        }
    });

    var n = idx.indexOf("|");
    cm_Globals.id = idx.substring(n+1);

    loadExistingFields(idx, false, false);
    $("#cm_customtype option[value='TEXT']").prop('selected',true);
    
    var pc = loadTextPanel();
    $("#cm_dynoContent").html(pc);
    initExistingFields();
}

// popup dialog box now uses createModal
function customizeTile(thingindex, aid, bid, str_type, hubnum) {  

    // save our tile id in a global variable
    cm_Globals.thingindex = thingindex;
    cm_Globals.aid = aid;
    cm_Globals.id = bid;
    cm_Globals.type = str_type;
    cm_Globals.hubnum = hubnum;
    cm_Globals.reload = false;
    cm_Globals.thingidx = str_type + "|" + bid;
    try {
        var customname = $("#a-"+aid+"-name").text();
    } catch(e) {
        customname = $("#s-"+aid).text();
    }
    cm_Globals.customname = customname;

    // start of dialog
    var dh = "<div id='customizeDialog' class='tileDialog'>";
    try {
        cm_Globals.returnURL = $("input[name='returnURL']").val();
    } catch(e) {
        cm_Globals.returnURL = "http://localhost:3080";
    }

    // get the rules const
    try {
        ENABLERULES = $("input[name='enablerules']").val() === "true";
    } catch(e) {
        ENABLERULES = true;
    }

    dh += "<div class='editheader' id='cm_header'>Customizing Tile #" + thingindex + "</div>";
    dh+= "<table class ='cm_table'>";
    dh+= "<tr>";
        dh+= "<td colspan='2'>" +  customHeaderPanel() + "</td>";
    dh+= "</tr>";
    dh+= "<tr>";
        dh+= "<td class='typepanel'>" +  customTypePanel() + "</td>";
        dh+= "<td class='dynopanel'>" +  customDynoPanel() + "</td>";
    dh+= "</tr>";
    dh+= "<tr>";
        dh+= "<td colspan='2'>" +  customInfoPanel() + "</td>";
    dh+= "</tr>";

    // end of dialog
    dh += "</div>";
    
    // create a function to display the dialog
    var dodisplay = function() {
        var pos = {top: 150, left: 250, zindex: 999};
        createModal("modalcustom", dh, "body", "Done", pos, 
            // function invoked upon leaving the dialog
            function(ui, content) {
                $("body").off("keydown");
                $("body").off("keypress");
                $("body").on("keypress", function(e) {
                    if ( e.keyCode===13  ){
                        return false;
                    }
                });
                // reload window unless modal Tile Editor window is open
                // but always skip if we didn't actually change anything
                cm_Globals.thingindex = null;
                cm_Globals.thingidx = null;

                // only reload if edit window isn't open
                // which will be true if we invoked the customizer from the edit window
                if ( cm_Globals.reload && ( typeof modalWindows["modalid"] === "undefined" || modalWindows["modalid"] === 0 ) ) {
                    location.reload(true);
                }
            },
            // function invoked upon starting the dialog
            function(hook, content) {
                
                $("body").on("keydown",function(e) {
                    if ( e.which===13  ){
                        $("#modalokay").click();
                    }
                    if ( e.which===27  ){
                        $("#modalcancel").click();
                    }
                });

                // grab the global list of all things and options
                if ( !cm_Globals.allthings || !cm_Globals.options ) {
                    // console.log("Please try again in a few moments. HousePanel is setting up your server...");
                    return;
                } else {
                    try {
                        getDefaultSubids();
                        var idx = cm_Globals.thingidx;
                        var allthings = cm_Globals.allthings;
                        var thing = allthings[idx];
                        $("#cm_subheader").html(thing.name);
                        initCustomActions();
                        handleBuiltin(cm_Globals.defaultclick);
                    } catch (e) {
                        console.log ("Error attempting to load the Tile Customoizer ...");
                        closeModal("modalcustom");
                    }
                }
                
                // initialize the actions
                $("#modalcustom").draggable();
            }
        );
    };
    
    // show the dialog
    dodisplay();
}

function customHeaderPanel() {
    var dh = "";
        dh+= "<h2>Tile Customizer for: ";
        dh+= "<span id='cm_subheader'></span></h2>";
    return dh;
}
    
// far left panel showing the customization type selector
function customTypePanel() {
    var dh = "";
    dh+= "<div class='cm_group'><div><label for='cm_typePanel'>Custom Type:</label></div>";
    dh+= "<div id='cm_typePanel'>";
    dh+= "<select id='cm_customtype' name='cm_customtype'>"; 
        dh+= "<option value='TEXT' selected>TEXT</option>";
        dh+= "<option value='POST'>POST</option>";
        dh+= "<option value='GET'>GET</option>";
        // dh+= "<option value='PUT'>PUT</option>";
        dh+= "<option value='URL'>URL</option>";
        dh+= "<option value='LINK'>LINK</option>";
        if ( ENABLERULES ) {
            dh+= "<option value='RULE'>RULE</option>";
        }
    dh+= "</select>";
    dh+= "</div></div>";

    // list of existing fields in our tile being customized
    // or a user entry box for a custom name
    // this whole section will be hidden with LINK types
    dh+= "<div id='cm_existingpick' class='cm_group'>";
        dh+= "<div>Existing Fields: <span class='ital'>(* custom fields)</span></div>";
        dh+= "<table class='cm_builtin'><tbody><tr>";
        dh+= "<td><select size='6' class='cm_builtinfields' id='cm_builtinfields' name='cm_builtinfields'>"; 
        dh+= "</select></td>";
        dh+= "<td><button class='arrow' id='cm_upfield'><img src='media/uparrow.jpg' width='30'></button><br>";
        dh+= "<button class='arrow' id='cm_dnfield'><img src='media/dnarrow.jpg' width='30'></button></td>";
        dh+= "</tr></table>";
        
        dh+= "<br><br><strong>OR...</strong><br><br>";
        dh+= "<div><label for='cm_userfield'>User Field Name:</label></div>";
        dh+= "<input id='cm_userfield' type='text' value=''></div>";
    dh+= "</div>";
    
    dh+= "<div class='cm_group'>";
        dh+= "<button class='cm_button' id='cm_addButton'>Add</button>";
        dh+= "<button class='cm_button' id='cm_delButton'>Del</button>";
    dh+= "</div>";
    
    return dh;
}

function customDynoPanel() {

    var dh = "";
    dh+= "<div id='cm_dynoContent'>";
    // dh+= loadTextPanel();
    dh+= "</div>";
    return dh;
}

function customInfoPanel() {
    var dh = "";
    dh+= "<div class='cm_group'><div><label for='cm_dynoInfo'>Information:</label></div>";
    dh+= "<textarea id='cm_dynoInfo' rows='6' readonly></textarea></div>";
    return dh;
}

// this little gem will sort by up to three things
function sortedSensors(one, two, three) {

    if ( !one ) { one = "name"; }

    // put sensors in an array so we can sort them
    var sensors = Object.values(cm_Globals.allthings).sort( function(obja, objb) {
        function test(a, b) {
            if ( typeof a === "object" || typeof b === "object" ) { return 0; }
            else if ( a===b ) { return 0 }
            else if ( a > b ) { return 1; }
            else { return -1; }
        }
        var check = test(obja[one], objb[one]);
        if ( check===0 && two ) {
            check = test(obja[two], objb[two]);
            if ( check===0 && three ) {
                check = test(obja[three], objb[three]);
            }
        }
        return check;
    });
    return sensors;
}

function loadLinkPanel(thingindex) {
    
    // section for LINK types - Drop down list, ID display, Field list, and a test button
    var dh = "";
    dh+= "<div class='cm_group'><div><label for='cm_link'>Linked Tile: </label></div>";
    // read all the tiles from the options file using API call
    dh+= "<select id='cm_link' name='cm_link'>"; 

    // go through all the things and make options list
    // and avoid linking to ourselves
    var results = "";
    var numthings = 0;
    var selected = "";

    // create a sorted list here
    var sensors = sortedSensors("name", "type", "hubnum");
    for ( i in sensors ) {
        var sensor = sensors[i];
        var thingid = sensor["id"];
        if ( thingid !== thingindex ) {
            var thingname = sensor["name"];
            var thingtype = sensor["type"];
            var idx = thingtype + "|" + thingid;
            if ( idx === cm_Globals.currentidx ) {
                selected = " selected";
            } else {
                selected = "";
            }
            results+= "<option value='" + idx + "'" + selected + ">" + thingname + " (" + thingtype + ")</option>";
            numthings++;
        }
    }
    
    dh+= results ;
    dh+="</select></div>";

    // list of available fields to select for the linked tile
    dh+= "<div class='cm_group'>Selected ID: <div id='cm_linkbid'></div>";
    dh+= "<div>Available Fields:</div>";
    dh+= "<select size='6' id='cm_linkfields' name='cm_linkfields'>"; 
    dh+="</select></div>";
    
    // preview button and panel
    dh += "<div class='cm_group'>";
        dh+= "<div><label for='cm_preview'>Preview:</label></div>";
        dh+= "<div class='cm_preview' id='cm_preview'></div>";
    dh+= "</div>";
    
    var infotext = "The \"LINK\" option enables you to " +
        "add any other field in any other tile in your smart home to the tile being customized. " +
        "In the top of the right column, select the tile to link to, and then select which field " +
        "of this tile to link into the customized tile using the \"Available Fields\" list above on the right. Once you are happy with " +
        "your selection, click the \"Add\" button and this field will be added to the list of \"Existing Fields\" " +
        "shown on the left side of this dialog box. You can mix and match this with any other addition. " +
        "You can add text or numbers to the end of the field name to make the link subid unique, or you can " +
        "leave it as-is. If the field name exists in the list on the left it will be replaced. " +
        "The existing fields list will be disabled when this type is selected. Change the type to move to " +
        "a different existing field or to change the type of this field away from a LINK.";
    $("#cm_dynoInfo").html(infotext);
    
    return dh;
}

function loadServicePanel(servicetype) {
    var content = cm_Globals.usertext;
    var dh = "";
    dh+= "<div id='cm_dynoText'>";
    dh+= "<div class='cm_group'><div><label for='cm_text'>" + servicetype + " Service URL</label></div>";
    dh+= "<input class='cm_text' id='cm_text' type='url' value='" + content + "'></div>";
    dh+= "</div>";
    
    // preview panel
    dh += "<div class='cm_group'>";
        dh+= "<div><label for='cm_preview'>Preview:</label></div>";
        dh+= "<div class='cm_preview' id='cm_preview'></div>";
    dh+= "</div>";
    
    var infotext = "The \"" + servicetype + "\" option enables you to " +
        "add a user-specified web service to the tile being customized using the " + servicetype + " method. " +
        "In the top of the right column, enter a valid URL to the web service. " +
        "You must also either pick the field this will override OR give a new user-defined field name using the entry box on the left. " +
        "Click the \"Add\" button and this field will be added to the list of \"Existing Fields\" " +
        "shown on the left side of this dialog box. You can mix and match this with any other addition.";
    $("#cm_dynoInfo").html(infotext);
    
    return dh;
}

function loadTextPanel() {
    var servicetype = "TEXT";
    var content = cm_Globals.usertext;
    var dh = "";
    dh+= "<div id='cm_dynoText'>";
    dh+= "<div class='cm_group'><div><label for='cm_text'>Custom Text: </label></div>";
    dh+= "<input class='cm_text' id='cm_text' type='text' value='" + content + "'></div>";
    dh+= "</div>";
    
    // preview panel
    dh += "<div class='cm_group'>";
        dh+= "<div><label for='cm_preview'>Preview:</label></div>";
        dh+= "<div class='cm_preview' id='cm_preview'></div>";
    dh+= "</div>";
    
    var infotext = "The \"" + servicetype + "\" option enables you to " +
        "add any user-specified text to the tile being customized. " +
        "In the top of the right column, enter the desired text. The text can valid HTML tags. " +
        "You must also either pick the field this will override OR give a new user-defined field name using the entry box on the left. " +
        "Click the \"Add\" button and this field will be added to the list of \"Existing Fields\" " +
        "shown on the left side of this dialog box. You can mix and match this with any other addition.";
    $("#cm_dynoInfo").html(infotext);
    
    return dh;
}

function loadRulePanel() {
    var servicetype = "RULE";
    var content = cm_Globals.usertext;
    var dh = "";
    dh+= "<div id='cm_dynoText'>";
    dh+= "<div class='cm_group'><div><label for='cm_rule'>Custom Rule: </label></div>";
    dh+= "<input class='cm_text' id='cm_text' type='text' value='" + content + "'></div>";
    dh+= "</div>";
    
    // preview panel
    dh += "<div class='cm_group'>";
        dh+= "<div><label for='cm_preview'>Preview:</label></div>";
        dh+= "<div class='cm_preview' id='cm_preview'></div>";
    dh+= "</div>";
    
    var infotext = "The \"" + servicetype + "\" option enables you to " +
        "add a rule to the tile being customized. A rule is a list of tile ID's to activate or de-activet. " +
        "In the top of the right column, enter the desired text. The text should be a comma separate list " +
        "of tile numbers=command, where command is either on, off, open, closed, etc. Any command supported is accepted. " +
        "You must also either pick the field this will override OR give a new user-defined field name using the entry box on the left. " +
        "Click the \"Add\" button and this field will be added to the list of \"Existing Fields\" " +
        "shown on the left side of this dialog box. You can mix and match this with any other addition.";
    $("#cm_dynoInfo").html(infotext);
    
    return dh;
}

function loadUrlPanel() {
    var servicetype = "URL";
    var content = cm_Globals.usertext;
    var dh = "";
    dh+= "<div id='cm_dynoText'>";
    dh+= "<div class='cm_group'><div><label for='cm_text'>Web Page URL: </label></div>";
    dh+= "<input class='cm_text' id='cm_text' type='url' value='" + content + "'></div>";
    dh+= "</div>";
    
    // preview panel
    dh += "<div class='cm_group'>";
    dh+= "<div><label for='cm_preview'>Preview:</label></div>";
    dh+= "<div class='cm_preview' id='cm_preview'></div>";
    dh+= "</div>";
    
    var infotext = "The \"" + servicetype + "\" option enables you to " +
        "add a user-specified webpage link to the tile being customized. " +
        "In the top of the right column, enter the URL of the web page. " +
        "You must also either pick the field this will override OR give a new user-defined field name using the entry box on the left. " +
        "Click the \"Add\" button and this field will be added to the list of \"Existing Fields\" " +
        "shown on the left side of this dialog box. You can mix and match this with any other addition.";
    $("#cm_dynoInfo").html(infotext);
    
    return dh;
}

// returns an options list of available fields of a given tile
function loadLinkItem(idx, allowuser, sortval, sortup) {
    var thing = cm_Globals.allthings[idx];
    // if ( !thing ) {
    //     idx = "clock|clockdigital";
    //     thing = cm_Globals.allthings[idx];
    // }
    try {
        var thevalue = thing["value"];
    } catch(e) {
        return;
    }

    // console.log("idx= ", idx, " loadLinkItem - thevalue= ", thevalue, " allowuser= ", allowuser);
    var initialsubids = Object.keys(thevalue);
    var subids = [];
    var numthings = 0;
    var results = "";
    var firstitem = (sortval===false) ? "" : sortval;
    var companion;

    // first load the native items
    for ( var tkey in thevalue ) {
        companion = "user_" + tkey;
        var tval = thevalue[tkey];

        // skip user configuration items
        // and skip prec values for ISY since those should never be modified by user
        if ( (!tkey.startsWith("prec_") || !idx.startsWith("isy") ) && 
             (!tkey.startsWith("user_") && !initialsubids.includes(companion)) ) {

            // check value for "json" strings
            // to handle objects and arrays
            try {
                var jsontval = JSON.parse(tval);
            } catch (jerr) {
                jsontval = null;
            }

            if ( jsontval && typeof jsontval==="object" ) {

                // var isarr = Array.isArray(jsontval);
                for (var jtkey in jsontval ) {
                    // var jtval = jsontval[jtkey];

                    // expand arrays and objects onto the base
                    // need to include objects so we can retrieve the original info
                    // shouldn't be needed for known types that do objects like audio and weather
                    // but if something unknown comes in we need to handle it
                    // arrays are also handled by adding the index to the base
                    // for example, this happens for buttons reporting acceptable values
                    jtkey = tkey + "_" + jtkey.toString();
                    companion = "user_" + jtkey;

                    // skip adding an object element if it duplicates an existing one
                    if ( !subids.includes(jtkey) && !initialsubids.includes(companion) ) {
                        var opttext = tkey;
                        if (('alias' in thing) && (jtkey in thing.alias)) {
                            opttext = thing.alias[jtkey];
                        }
                        results+= "<option value='" + jtkey + "'>" + opttext + "</option>";
                        subids.push(jtkey);
                        numthings++;
                        if ( !firstitem  ) {
                            firstitem = jtkey;
                        }
                    }
                }

            } else if ( !subids.includes(tkey) ) {
                // If an alias name exists, then use it instead of the key
                var opttext = tkey;
                if (('alias' in thing) && (tkey in thing.alias)) {
                    opttext = thing.alias[tkey];
                }
                results+= "<option value='" + tkey + "'>" + opttext + "</option>";

                subids.push(tkey);
                numthings++;
                if ( !firstitem  ) {
                    firstitem = tkey;
                }
            }
        }
    }
    
    // now load the custom fields
    // first sort and make sure we get rid of dups
    if ( allowuser ) {
        var uid = "user_" + cm_Globals.id;
        // console.log("uid: ", uid, " subids: ", cm_Globals.options[uid]);
        sortExistingFields(sortval, sortup);
        $.each(cm_Globals.options[uid], function(index, val) {
            var subid = val[2];

            var alias = "";
            if ( val[0] == "LINK" ) {
                var linkid = val[1];
                var idx = Object.keys(cm_Globals.options.index).find(key => cm_Globals.options.index[key] == linkid);
                var linkthing = cm_Globals.allthings[idx];
                if (("alias" in linkthing) && (subid in linkthing.alias )) {
                   alias = " (" + linkthing.alias[subid] + ")";
                }
            }

            results+= "<option value='" + subid + "'>" + subid + alias + "<span class='reddot'> *</span></option>";
            numthings++;
            if ( !firstitem  ) {
                firstitem = subid;
            }
        });
    }
    
    return {fields: results, num: numthings, firstitem: firstitem};
}
 
 function initLinkActions(linkidx, subid) {
    // get our fields and load them into link list box
    // and select the first item

    var options = cm_Globals.options;
    
    // if the link isn't there then reset to digital clock default
    if ( !linkidx || !cm_Globals.allthings[linkidx] ) {
        linkidx = cm_Globals.currentidx;
    } else {
        cm_Globals.currentidx = linkidx;
    }

    var n = linkidx.indexOf("|");
    var bid = linkidx.substring(n+1);
    linkid = options.index[linkidx];
    
    // set the drop down list to the linked item
    $("#cm_link").prop("value", linkidx);
    $("#cm_link option[value='" + linkidx + "']").prop('selected',true);
                
    $("#cm_linkbid").html(bid + " => Tile #" + linkid);
    
    // read the existing fields of the linked tile, excluded user items
    var results = loadLinkItem(linkidx, false, false, false);
    $("#cm_linkfields").html(results.fields);
    
    // highlight the selected item. if nothing preselected use first item
    if ( !subid ) {
        subid = results.firstitem;
    }
    $("#cm_linkfields option[value='" + subid + "']").prop('selected',true);

    // put this in the user field on the left for editing
    $("#cm_userfield").attr("value",results.firstitem);
    $("#cm_userfield").prop("value",results.firstitem);
    $("#cm_userfield").val(subid);
    
    // activate clicking on item by getting the id of the item selected
    // and save it in our global for later use 
    // then fill the list box with the subid's available
    $("#cm_link").off('change');
    $("#cm_link").on('change', function(event) {
        var linkidx = $(this).val();
        var n = linkidx.indexOf("|");
        var bid = linkidx.substring(n+1);
        cm_Globals.currentidx = linkidx;
        var options = cm_Globals.options;
        var linkid = options.index[cm_Globals.currentidx];
        $("#cm_linkbid").html(bid + " => Tile #" + linkid);
        var results = loadLinkItem(linkidx, false, false, false);
        $("#cm_linkfields").html(results.fields);
        initLinkSelect();
        $("#cm_linkfields option[value='" + results.firstitem + "']").prop('selected',true).click();
        event.stopPropagation();
    });
 
    initLinkSelect();
}

function initLinkSelect() {
    $("#cm_linkfields option").off('click');
    $("#cm_linkfields option").on('click', function(event) {
        var subid = $(this).val();
        $("#cm_userfield").attr("value",subid);
        $("#cm_userfield").prop("value",subid);
        $("#cm_userfield").val(subid);
        
        // get the subids of the tile being customized
        var allthings = cm_Globals.allthings;
        var idx = cm_Globals.thingidx;
        var thing = allthings[idx];
        var value = thing.value;
        var subids = Object.keys(value);

        // disable or enable the Del button based on user status
        var companion = "user_" + subid;
        if ( subids.includes(companion) ) {
            $("#cm_delButton").removeClass("disabled").prop("disabled",false);
        } else {
            $("#cm_delButton").addClass("disabled").prop("disabled",true);
        }
        
        // change button label to Add or Replace based on existing or not
        if ( subids.includes(subid) ) {
            $("#cm_addButton").text("Replace");
        } else {
            $("#cm_addButton").text("Add");
        }
        
        event.stopPropagation();
   });
    
}

/* 
 * routines that initialize actions upon selection
 */
function initCustomActions() {
    
    $("#cm_customtype").off('change');
    $("#cm_customtype").on('change', function (event) {
        var thingindex = cm_Globals.thingindex;
        var customType = $(this).val();
        var content;
        
        
        // load the dynamic panel with the right content
        if ( customType === "LINK" ) {
            
            if ( ! cm_Globals.allthings ) {
                alert("Still loading data... please try again in a few moments.");
                $("#cm_customtype option[value='TEXT']").prop('selected',true)
                customType = "TEXT";
                content = loadTextPanel();
                $("#cm_dynoContent").html(content);
                initExistingFields();
                
                // auto select the first item
                $("#cm_builtinfields > option").first().prop('selected',true).click();
            } else {
                content = loadLinkPanel(thingindex);
                $("#cm_dynoContent").html(content);
                initLinkActions(null, null);
            }
        } else if ( customType ==="URL" ) {
            content = loadUrlPanel();
            $("#cm_dynoContent").html(content);
            initExistingFields();
        } else if ( customType === "POST" || customType === "GET" || customType === "PUT" ) {
            content = loadServicePanel(customType);
            $("#cm_dynoContent").html(content);
            initExistingFields();
        } else if ( ENABLERULES && customType ==="RULE" ) {
            content = loadRulePanel();
            $("#cm_dynoContent").html(content);
            initExistingFields();
        } else {
            content = loadTextPanel();
            $("#cm_dynoContent").html(content);
            initExistingFields();
        }
        
        showPreview();
        event.stopPropagation;
    });
    
    $("#cm_addButton").off("click");
    $("#cm_addButton").on("click", function(event) {
        var subid = $("#cm_userfield").val();
        applyCustomField("addcustom", subid);
        event.stopPropagation;
    });
    
    $("#cm_delButton").off("click");
    $("#cm_delButton").on("click", function(event) {
        
        if ( $(this).hasClass("disabled") ) {
            event.stopPropagation;
            return;
        }
        
        var pos = {top: 375, left: 380, zindex: 9999, background: "red", color: "white", position: "absolute"};
        var subid = $("#cm_userfield").val();
        var tilename = $("#cm_subheader").html();
        createModal("modalremove","Remove item: " + subid + " from tile: " + tilename + "<br> Are you sure?", "table.cm_table", true, pos, function(ui) {
            var clk = $(ui).attr("name");
            if ( clk==="okay" ) {
                applyCustomField("delcustom", subid);
            }
        });
        event.stopPropagation;
    });
    
    $("#cm_text").on("change", function(event) {
        cm_Globals.usertext = $(this).val();
    });
}
 
function loadExistingFields(idx, sortval, sortup) {
    // show the existing fields
    var results = loadLinkItem(idx, true, sortval, sortup);
    // console.log("loadExistingFields results: ", results);
    if ( results ) {

        $("#cm_builtinfields").html(results.fields);
        var subid = results.firstitem;
        cm_Globals.defaultclick = subid;
        
        // set the default click
        $("#cm_builtinfields option[value='"+subid+"']").prop('selected',true);
        
        // text input for user values
        $("#cm_userfield").attr("value",subid);
        $("#cm_userfield").val(subid);
    }
    
    showPreview();
}

// update the options arrays
function sortUpdate(uid) {
    try 
    {
        var swid = cm_Globals.id;
        var swtype = cm_Globals.type;
        var idx = swtype + "|" + swid;
        var opts = cm_Globals.options[uid];
        // console.log("id= ", swid, " type= ", swtype, " opts= ", opts);
        $.post(cm_Globals.returnURL, {useajax: "sortupdate", id: swid, type: swtype, value: opts, attr: uid},
            function (presult, pstatus) {
                if (pstatus==="success" && typeof presult==="object" ) {
                    cm_Globals.allthings[idx]["value"] = presult;
                } else {
                    console.log(presult);
                }
            }
        );
    } catch (e) {
        console.log("error - failure updating your hmoptions.cfg file based on resort of user options");
    }
}

function sortExistingFields(item, up) {
    
    // go through all the subs, eliminate dups, change order
    var uid = "user_" + cm_Globals.id;
    var useroptions = cm_Globals.options[uid];
    var newoptions = []; // useroptions.slice(0);

    // first eliminate dups and list everything in order
    var lastindex = 0;
    $.each(useroptions, function(index, val) {
        var existing = false;
        $.each(newoptions, function(newi, newv) {
            if ( newv[2] === val[2] ) {
                existing = true;
                return false;
            }
        });
        
        if ( !existing ) {
            lastindex++;
            val[3] = lastindex;
            newoptions.push(val);
        }
    });

    // now set order
    if ( item && up ) {
        var k;
        var lenm1 = newoptions.length - 1;
        $.each(newoptions, function(index, val) {
            if ( item && val[2]===item ) {
                if ( up==="up" && index>0 ) {
                    k = newoptions[index-1][3];
                    newoptions[index-1][3] = val[3];
                    newoptions[index][3] = k;
                } else if ( up==="down" && index<lenm1 ) {
                    k = newoptions[index+1][3];
                    newoptions[index+1][3] = val[3];
                    newoptions[index][3] = k;
                }
                return false;
            }
        });
    }
    
        // sort the items into proper order
        newoptions.sort( function(a,b) {
            var ia = parseInt(a[3],10);
            var ib = parseInt(b[3],10);
            return ( ia - ib );
        });
    
    if ( up ) {
            // this is where the new order of custom tiles is set up
        cm_Globals.options[uid] = newoptions.slice(0);
        
        // save the options so we have them to use later
        sortUpdate(uid);
    }
}

function initExistingFields() {
    var idx = cm_Globals.thingidx;
    
    // re-enable the user and build in fields
    $("#cm_userfield").prop("readonly",false).removeClass("readonly");
    $("#cm_builtinfields").prop("readonly",false).prop("disabled",false).removeClass("readonly");

    $("#cm_userfield").off('input');
    $("#cm_userfield").on('input', function(event) {
        var subid = $("#cm_userfield").val();
        var allthings = cm_Globals.allthings;
        var thing = allthings[idx];
        var value = thing.value;
        var subids = Object.keys(value);
        
        // change button label to Add or Replace based on existing or not
        if ( subids.includes(subid) ) {
            var companion = "user_" + subid;
            if ( subids.includes(companion) ) {
                $("#cm_delButton").removeClass("disabled").prop("disabled", false);
            } else {
                $("#cm_delButton").addClass("disabled").prop("disabled",true);
            }
            $("#cm_addButton").text("Replace");
        } else {
            $("#cm_addButton").text("Add");
            $("#cm_delButton").addClass("disabled").prop("disabled",true);
        }
    });
    
    $("#cm_upfield").off('click');
    $("#cm_upfield").on('click', function(event) {
        if ( $(this).hasClass("disabled") ) {
            event.stopPropagation;
            return;
        }
        var sortval = $("#cm_userfield").val();
        loadExistingFields(idx, sortval, "up");
        initExistingFields();
        cm_Globals.reload = true;
        event.stopPropagation();
    });
    
    $("#cm_dnfield").off('click');
    $("#cm_dnfield").on('click', function(event) {
        if ( $(this).hasClass("disabled") ) {
            event.stopPropagation;
            return;
        }
        var sortval = $("#cm_userfield").val();
        loadExistingFields(idx, sortval, "down");
        initExistingFields();
        cm_Globals.reload = true;
        event.stopPropagation();
    });
    
    // fill in the user item with our selected item
    $("#cm_builtinfields option").off('click');
    $("#cm_builtinfields option").on('click', function(event) {
        var subid = $(this).val();
        handleBuiltin(subid);
        event.stopPropagation();
   });
    
    $("#cm_text").on("change", function(event) {
        cm_Globals.usertext = $(this).val();
    });
}

function handleBuiltin(subid) {
    var idx = cm_Globals.thingidx;
    var allthings = cm_Globals.allthings;
    var thing = allthings[idx];
    var value = thing.value;
    var subids = Object.keys(value);
    var companion = "user_" + subid;
    cm_Globals.defaultclick = subid;

    // put the field clicked on in the input box
    $("#cm_userfield").attr("value",subid);
    $("#cm_userfield").val(subid);

    // check for an object
    var cmtext;
    if ( typeof(value[subid])==="undefined" ) {
        var ipos = subid.indexOf("_");
        if ( ipos===-1 ) {
            cmtext = "unknown";
        } else {
            var subid1 = subid.substr(0, ipos);
            var subid2 = subid.substr(ipos+1);
            try {
                var jsontval = JSON.parse(value[subid1]);
            } catch (jerr) {
                jsontval = null;
            }
    
            if ( typeof jsontval==="object" ) {
                cmtext = jsontval[subid2];
                // alert("cmtext = " + cmtext + " subid1= " + subid1 + " value: " + value[subid1]);
            } else {
                cmtext = "unknown";
            }
        }
    } else {
        cmtext = value[subid];
    }

    var helpers = ["","TEXT",cmtext];
    var cmtype = "TEXT";
    if ( subids.includes(companion) ) {
        var helperval = value[companion];
        helpers = helperval.split("::");

        // helpers will always be this size now
        if ( helpers.length===3) {
            cmtype = helpers[1];
            if ( cmtype==="LINK" || cmtype==="RULE" || cmtype==="TEXT" ) {
                cmtext = helpers[2];
            } else {
                cmtext = decodeURI(helpers[2]);
            }
            // if ( cmtype==="TEXT" ) {
            //     cmtext = cmtext.replace( /\+/g, ' ' );
            // }
        }
    }

    // update dyno panel
    if ( cmtype==="LINK" ) {
        // var oldval = $("#cm_customtype").val();
        var linkid = helpers[2];
        $("#cm_customtype").prop("value", "LINK");
        $("#cm_customtype option[value='LINK']").prop('selected',true);
        var content = loadLinkPanel(cm_Globals.thingindex);
        $("#cm_dynoContent").html(content);
        initLinkActions(linkid, subid);
    } else {
        $("#cm_customtype").prop("value", cmtype);
        $("#cm_customtype option[value='" + cmtype + "']").prop('selected',true)
        $("#cm_text").val(cmtext);
        cm_Globals.usertext = cmtext;
        var content;
        if (cmtype==="POST" || cmtype==="GET" || cmtype==="PUT") {
            content = loadServicePanel(cmtype);
            $("#cm_dynoContent").html(content);
        } else if ( cmtype==="URL") {
            content = loadUrlPanel();
            $("#cm_dynoContent").html(content);
        } else if ( ENABLERULES && cmtype==="RULE") {
            content = loadRulePanel();
            $("#cm_dynoContent").html(content);
        } else {
            content = loadTextPanel();
            $("#cm_dynoContent").html(content);
        }
        initExistingFields();
    }
    showPreview();

    // disable or enable the Del button based on user status
    if ( subids.includes(companion) ) {
        $("#cm_delButton").removeClass("disabled").prop("disabled", false);
        $("#cm_upfield").removeClass("disabled").prop("disabled",false);
        $("#cm_dnfield").removeClass("disabled").prop("disabled",false);
    } else {
        $("#cm_delButton").addClass("disabled").prop("disabled", true);
        $("#cm_upfield").addClass("disabled").prop("disabled",true);
        $("#cm_dnfield").addClass("disabled").prop("disabled",true);
        $("#cm_text").val(cmtext);
        cm_Globals.usertext = cmtext;
    }

    // change button label to Add or Replace based on existing or not
    if ( subids.includes(subid) ) {
        $("#cm_addButton").text("Replace");
    } else {
        $("#cm_addButton").text("Add");
    }
}

// function uses php to save the custom info to hmoptions.cfg
// for this call value and attr mean something different than usual
// changed type back to what it usually is
function applyCustomField(action, subid) {
    var id = cm_Globals.id;
    var tileid = cm_Globals.thingindex;
    var idx = cm_Globals.thingidx;
    var customtype = $("#cm_customtype").val();
    var content = "";
    var options = cm_Globals.options;
    if ( customtype==="LINK" ) {
        content = options.index[cm_Globals.currentidx];
    } else {
        content = $("#cm_text").val();
    }
    
    // check for valid entries
    // skip URL check to enable Android stuff
    var errors = [];
    if ( subid && subid.length < 2 && subid!=="password" ) {
        errors.push("Your selected user field name [" + subid + "] is too short. Must be at least 2 characters");
    }
    if ( (customtype==="POST" || customtype==="GET" || customtype==="PUT") && 
         ( !content.startsWith("http://") && !content.startsWith("https://") ) ) {
        errors.push("User content for web type entries must begin with http or https"); 
    }
    if ( action==="addcustom" && customtype==="TEXT" && content.length===0 ) {
        errors.push("Custom text provided for TEXT type addition is empty");
    }
    
    if ( errors.length ) {
        var errstr = errors.join("\n  ");
        alert("Invalid entries:\n" + errstr);
    } else {
        
        // show processing window
        // var pos = {top: 5, left: 5, zindex: 9999, background: "red", color: "white"};
        // createModal("waitbox", "Processing " + action + " Please wait...", "table.cm_table", false, pos);
        
        // make the call
        $.post(cm_Globals.returnURL, 
            {useajax: action, id: id, type: cm_Globals.type, value: customtype, attr: content, tile: tileid, subid: subid},
            function (presult, pstatus) {
                if (pstatus==="success") {
                    // console.log (action + " performed successfully. presult: ", presult);
                    cm_Globals.reload = true;

                    // we get new data from server since it is much faster that way
                    // var pvalue = presult.value;
                    cm_Globals.options = presult.options;
                    cm_Globals.allthings = presult.things;
                    
                    // update content since pw could have changed it
                    if ( subid==="password" && customtype!=="LINK" ) {
                        content = presult[subid];
                        $("#cm_text").val(content);
                        cm_Globals.usertext = content;
                    }
                    
                    // update the visual boxes on screen
                    if ( action==="addcustom" ) {
                        loadExistingFields(idx, subid, false);
                        handleBuiltin(subid);
                    } else {
                        getDefaultSubids();
                    }
                    // closeModal("waitbox");
                } else {
                    console.log("Error attempting to perform " + action + ". presult: ", presult);
                    // closeModal("waitbox");
                }
            }, "json"
        );
    }
   
}

function showPreview() {
    var bid = cm_Globals.id;
    var str_type = cm_Globals.type;
    var tileid = cm_Globals.thingindex;
    var uid = "user_" + bid;
    var swattr = cm_Globals.customname;
    // var swval = "";
    // if ( cm_Globals.options[uid] ) {
    //     swval = cm_Globals.options[uid];
    // }
    
    $.post(cm_Globals.returnURL, 
        {useajax: "wysiwyg", id: bid, type: str_type, tile: tileid, value: "tc_wysiwyg", attr: swattr},
        function (presult, pstatus) {
            if (pstatus==="success" ) {
                $("#cm_preview").html(presult);

                // activate click on items
                $("#tc_wysiwyg").off('click');
                $("#tc_wysiwyg").on('click', function(event) {
                    var subid = $(event.target).attr("subid");
                    // console.log("subid= ", subid);
                    if ( typeof subid!=="undefined" ) {
                        // find the item and select it
                        try {
                            $("#cm_builtinfields > option[value='" + subid + "']").prop('selected',true).click();
                        } catch(e) {}
                        // $("#cm_userfield").html(subid);
                        // handleBuiltin(subid);
                    }
                    event.stopPropagation();
                });
            
                var slidertag = "#cm_preview div.overlay.level >div.level";
                if ( $(slidertag) ) {
                    $(slidertag).slider({
                        orientation: "horizontal",
                        min: 0,
                        max: 100,
                        step: 5
                    });
                }
            }
        }
    );
}
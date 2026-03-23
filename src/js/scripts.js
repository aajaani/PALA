var supportedArchiveTypes=['application/x-zip-compressed'
                            ,'application/zip'
                            ,'application/x-tar'
                            ,'application/x-7z-compressed'
                            ,'application/x-rar-compressed'];

var files=[];
var modalJsonLog=[];
var logCacheInterval=50;
var errorAnalysing=[];
var textGraphDataLog={};
var csvValues=[];
var filesParsed=0;
var pendingAnalyses=0;
var similarityDataAllFiles={};
var similarityAnalysisResults={};

//similarityAnalysis variables
var pastedTextMinLength=50; //default
var sourceCodeMinLength=100; //default
var sourceCodeSimilarityPercent=90; //default
var workAnalysisRunCount=0; //default
var workAnalysisTimeSpentMinutes=15; //default
var workAnalysisSize=100; //default
var pastedTextPercent=80; //default


var chart;
const decoder = new TextDecoder('utf-8');
const fullOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
};

$(function() {
    console.log( "ready!" );

    addListeners();

    $('[data-toggle="popover"]').popover({
        trigger: 'focus'
      });

    Split({
        columnGutters: [{
        track: 1,
        element: document.querySelector('.vertical-gutter'),
      }],
      rowGutters: [{
          track: 1,
        element: document.querySelector('.horizontal-gutter'),
      }]
    });

    $('#pastedTextMinLengthInput').val(pastedTextMinLength);
    $('#sourceCodeMinLengthInput').val(sourceCodeMinLength);
    $('#sourceCodeSimilarityPercentInput').val(sourceCodeSimilarityPercent);
    $('#workAnalysisRunCountInput').val(workAnalysisRunCount);
    $('#workAnalysisTimeSpentMinutesInput').val(workAnalysisTimeSpentMinutes);
    $('#workAnalysisSizeInput').val(workAnalysisSize);
    $('#pastedTextPercentInput').val(pastedTextPercent);

    $('#saveSimilarityAnalysisVariables').tooltip({
        title: 'Saved',
        placement: 'right',
        trigger: 'manual'
    });
});
 

/** adds listeners to html elements
 * 
 *  */ 
function addListeners(){
    $("#log-button").click(fileSubmit); //clicked on analyse button
    $("#input-log-type").change(toggleLogArea); //toggled file input
    $(".log-input").change(showLogInputData); //file or folder chosen then shown in log input area
    $("#expand-choose-logs").click(toggleChooseLogs); 
    $('#sidebarCollapse').click(toggleSidebar);
    $('#replayerModal').on('shown.bs.modal', replayerOnShown); //This event is fired when the modal has been made visible to the user 
    $('#replayerModal').on('hide.bs.modal', replayerOnHide);   //This event is fired immediately when the hide instance method has been called.
    $('#similarity-analysis-modal').on('hide.bs.modal', similarityOnHide);   //This event is fired immediately when the hide instance method has been called.
    $('#replayerModal').on('hidden.bs.modal', replayerOnHidden); //This event is fired when the modal has finished being hidden from the user (will wait for CSS transitions to complete).
    $('#modal-sidebar-event-list').on('keydown', onKeyDown); //allows to move around with arrow keys   #log-analysis-groups
    $('#textGraphModal').on('hidden.bs.modal', textGraphOnHidden); //This event is fired when the modal has finished being hidden from the user (will wait for CSS transitions to complete).
    $('.btn-replayer-controls').click(replayerAutoPlay);
    $('#download-csv-button').click(getLogfileProgramAnalytics);
    $('#compare-button').click(getSimilarityAnalysisData);
    $('#saveSimilarityAnalysisVariables').click(saveSimilarityAnalysisVariables);
}

function saveSimilarityAnalysisVariables(){
    pastedTextMinLength=parseInt($('#pastedTextMinLengthInput').val());
    sourceCodeMinLength=parseInt($('#sourceCodeMinLengthInput').val());
    sourceCodeSimilarityPercent=parseInt($('#sourceCodeSimilarityPercentInput').val());
    workAnalysisRunCount=parseInt($('#workAnalysisRunCountInput').val());
    workAnalysisTimeSpentMinutes=parseInt($('#workAnalysisTimeSpentMinutesInput').val());
    workAnalysisSize=parseInt($('#workAnalysisSizeInput').val());
    pastedTextPercent=parseInt($('#pastedTextPercentInput').val());

    $('#saveSimilarityAnalysisVariables').tooltip('show');
    setTimeout(function() {
        $('#saveSimilarityAnalysisVariables').tooltip('hide');
    }, 1000);
}


/**Downloads csv file with results of log analysis
 *
 */
function downloadCsv() {
    if (csvValues.length == 0) {
        return;
    }
    csvRows = [];
    csvRows.push(Object.keys(csvValues[0]).join(','));
    for (const row of csvValues) {
        csvRows.push(Object.values(row).join(','));
    }
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    // Creating an object for downloading url
    const url = window.URL.createObjectURL(blob);
    // Creating an anchor(a) tag of HTML
    const a = document.createElement('a');
    // Passing the blob downloading url
    a.setAttribute('href', url);
    let fileDate= (new Date(Date.now())).toISOString().split('.')[0].replaceAll(/:/g,'-');
    a.setAttribute('download', `log-analysis-${fileDate}.csv`);
    // Performing a download with click
    a.click();
}

/**
 * iterate over files and send them to be analysed
 */
function getLogfileProgramAnalytics(){
    for(let i=0;i<csvValues.length;i++){
        let entryId = csvValues[i]["entryId"];
        let isZipObject=files[entryId].type=="zip";
        readObject(files[entryId].file, entryId, "csvAnalytics", '', isZipObject);
    }
}

/** destroys created chart
 * 
 */
function textGraphOnHidden(){
    chart.destroy();
    $("#modal-main-header-graph").empty();
    textGraphDataLog={};
}


/** This event is fired when the modal has been made visible to the user 
 *  Make first element in event list active
 */
function replayerOnShown(){
    $('#event-list-row-0').focus();   
}


/** This event is fired immediately when the hide instance method has been called.
 *  Event list will be scrolled back to top
 */
function replayerOnHide(){
    $('#modal-sidebar-event-list').scrollTop(0);
}


/** This event is fired when the modal has finished being hidden from the user (will wait for CSS transitions to complete).
 * 
 */
function replayerOnHidden(){
    modalJsonLog=[];
    $('#modal-sidebar-event-list').empty();  //eemaldame kirjed replayerist
    $("#modal-main-header-replayer").empty();
    $("#modal-program-text").empty();
    $("#modal-shell-text").empty();
    resetReplayerPlayBtn();
}


/**
 * toggles sidebar
 */
function toggleSidebar(){
    $('.sidebar, .content').toggleClass('active');
}

/**
 * displays sidebar
 */
function showSidebar(){
    $('.sidebar, .content').addClass('active');

}

/** toggles log choosing area
 * 
 */
function toggleChooseLogs(){

    var goToTop=!$("#choose-logs").hasClass("show");

    $("#choose-logs").collapse('toggle');

    if (goToTop){
        $(window).scrollTop(0);
    }
    
}

/** shows text of how many files chosen
 * 
 */
function showLogInputData(){
    var logTypeFile=$("#input-log-type")[0].checked;
    var lenFiles=$(this)[0].files.length;

    if(logTypeFile){//file
        $("#log-input-file-msg").text(lenFiles+' files chosen.');
    }else{//folder
        $("#log-input-folder-msg").text(lenFiles+' files present in selected folder.');
    }
}

/**switches list item
 * 
 */
function switchListItem(keyEvent){
    if (keyEvent.code=="Tab" || keyEvent.type=="click"){
        if ($("#input-analysis-type")[0].checked){ //Multiple student analysis
            $('.failid.active').removeClass('active');
            $('#class-overview').hide();
            $('#class-overview-btn').removeClass('active');
        }
        $(".tab-pane.active").removeClass('active show');

        if (keyEvent.code=="Tab"){
            $(this).tab('show');
        }

        if ($("body").hasClass('modal-open')){

            var entryId=$(this)[0].attributes['aria-controls'].value

            if (files[entryId]==null){
                alert('File not found in input space.')
            }
            var isZipObject=files[entryId].type=="zip";
            if($('#replayerModal').hasClass('show')){
                replayerOnHidden();
                $('#modal-sidebar-event-list').scrollTop(0);
                readObject(files[entryId].file, entryId, "replayer", '', isZipObject);
            }else if($('#textGraphModal').hasClass('show')){
                chart.destroy();
                textGraphDataLog={};
                readObject(files[entryId].file, entryId, "textGraph", '', isZipObject);
            }
        }
    }
}


/** scroll replayer event rows with arrow keys
 * 
 */
function onKeyDown(keyEvent){
    if(["ArrowUp","ArrowDown"].indexOf(keyEvent.code) > -1) {
        keyEvent.preventDefault();
        if(keyEvent.code=="ArrowUp"){
            $(".event-list-row.active").prev().focus();
        }else if(keyEvent.code=="ArrowDown"){
            $(".event-list-row.active").next().focus();
        }
    }
} 


/** switch between grouped log file folders in analysed files
 * 
 */
function switchFolder(keyEvent){
    if (keyEvent.code=="Tab"){
        $(this).click();
    }
}

/**
 * toggle file input and text inside based on file input checkbox
 */
function toggleLogArea(){
    $(".log-input-msg").toggleClass('d-none');
    $(".log-input").toggleClass('d-none');

}

/**
 * clear previously analysed results
 */
function clearAnalysisResults(){
    $('#log-analysis-groups').children().remove();
    $('#log-analysis-results').children().remove();
    $('#class-overview').remove();
    $('#class-overview-btn').prop('disabled', true).removeClass('active');
}

// Aggregates error metrics across all students.
function generateClassOverview() {
    $('#class-overview').remove();

    let eqValues = [];
    let redValues = [];
    let totalCompileErrors = 0;
    let totalRuntimeErrors = 0;

    let compileErrorCats = {};  // category -> { count, students: Set }
    let runtimeErrorCats = {};
    let otherCompileTypes = {}; // error_type -> { count, students: Set }
    let otherRuntimeTypes = {};
    let ttfByCategory = {};     // category -> { fixTimes: [], unfixed: 0 }

    let studentRows = [];

    // group files by student (foldername), one student can have multiple log files
    let studentGroups = {};
    for (let i = 0; i < csvValues.length; i++) {
        let csv = csvValues[i];
        let studentName = csv['foldername'] || csv['filename'] || '';
        if (!studentGroups[studentName]) {
            studentGroups[studentName] = [];
        }
        studentGroups[studentName].push({ csv, entryId: csv['entryId'] });
    }

    let totalStudents = Object.keys(studentGroups).length;

    for (let studentName in studentGroups) {
        let group = studentGroups[studentName];
        let entryIds = group.map(g => g.entryId);

        // collect all builds from all files for this student, sorted chronologically
        let allBuilds = [];
        for (let eid of entryIds) {
            if (files[eid] && files[eid]['errorAnalysis']) {
                allBuilds.push(...files[eid]['errorAnalysis'].builds);
            }
        }
        allBuilds.sort((a, b) => new Date(a.time) - new Date(b.time));

        // minimum 5 builds to compute eq/red, unless last build failed (student gave up with unresolved errors)
        let lastBuildFailed = allBuilds.length > 0 && allBuilds[allBuilds.length - 1].success === false;
        let enoughBuilds = allBuilds.length >= 5 || (allBuilds.length >= 2 && lastBuildFailed);

        let studentEq = null;
        if (allBuilds.length >= 2 && enoughBuilds) {
            let score = 0;
            let pairs = allBuilds.length - 1;
            for (let i = 0; i < pairs; i++) {
                let e1 = allBuilds[i].errors;
                let e2 = allBuilds[i + 1].errors;
                let delta = 0;
                if (e1.length > 0 && e2.length > 0) {
                    delta += 8;
                    let t1 = new Set(e1.map(e => e.error_category === 'other' ? e.error_type : e.error_category));
                    let t2 = new Set(e2.map(e => e.error_category === 'other' ? e.error_type : e.error_category));
                    let shared = new Set([...t1].filter(x => t2.has(x)));
                    if (shared.size > 0) delta += 3;
                }
                score += delta / 11;
            }
            studentEq = score / pairs;
        }

        // recompute RED from merged builds
        let studentRed = null;
        if (allBuilds.length >= 2 && enoughBuilds) {
            let red = 0, divisor = 0, repeated = 0;
            for (let i = 1; i < allBuilds.length; i++) {
                divisor++;
                let t1 = new Set(allBuilds[i - 1].errors.map(e => e.error_category === 'other' ? e.error_type : e.error_category));
                let t2 = new Set(allBuilds[i].errors.map(e => e.error_category === 'other' ? e.error_type : e.error_category));
                let shared = new Set([...t1].filter(x => t2.has(x)));
                if (shared.size > 0) {
                    repeated++;
                } else {
                    if (repeated > 0) red += (repeated ** 2) / (repeated + 1);
                    repeated = 0;
                }
            }
            if (repeated > 0) red += (repeated ** 2) / (repeated + 1);
            studentRed = divisor > 0 ? red / divisor : null;
        }

        // sum counts across all files
        let studentCompileErrors = 0, studentRuntimeErrors = 0, studentFailedBuilds = 0;
        for (let g of group) {
            studentCompileErrors += parseInt(g.csv['compile error count']) || 0;
            studentRuntimeErrors += parseInt(g.csv['runtime error count']) || 0;
            studentFailedBuilds += parseInt(g.csv['failed build count']) || 0;
        }

        if (studentEq !== null) eqValues.push(studentEq);
        if (studentRed !== null) redValues.push(studentRed);
        totalCompileErrors += studentCompileErrors;
        totalRuntimeErrors += studentRuntimeErrors;

        studentRows.push({
            name: sanitizeName(studentName),
            entryId: entryIds[0],
            eq: studentEq,
            red: studentRed,
            failedBuilds: studentFailedBuilds,
            compileErrors: studentCompileErrors
        });

        // aggregate error categories across all files for this student
        for (let eid of entryIds) {
            if (files[eid] && files[eid]['errorAnalysis']) {
                let events = files[eid]['errorAnalysis'].errorEvents;
                for (let e of events) {
                    let target = e.phase === 'compile' ? compileErrorCats : runtimeErrorCats;
                    if (!target[e.error_category]) {
                        target[e.error_category] = { count: 0, students: new Set() };
                    }
                    target[e.error_category].count++;
                    target[e.error_category].students.add(studentName);
                    if (e.error_category === 'other') {
                        let otherTarget = e.phase === 'compile' ? otherCompileTypes : otherRuntimeTypes;
                        if (!otherTarget[e.error_type]) {
                            otherTarget[e.error_type] = { count: 0, students: new Set() };
                        }
                        otherTarget[e.error_type].count++;
                        otherTarget[e.error_type].students.add(studentName);
                    }
                }
            }

        }

        // recompute time to fix from merged builds 
        if (allBuilds.length >= 2) {
            let fixTimesByCategory = {};
            for (let i = 0; i < allBuilds.length; i++) {
                let catOrigin = {};
                for (let e of allBuilds[i].errors) {
                    let key = e.error_category === 'other' ? e.error_type : e.error_category;
                    catOrigin[key] = e.error_category;
                }
                let categories = new Set(Object.keys(catOrigin));
                if (categories.size === 0) continue;
                let prevCategories = i > 0 ? new Set(allBuilds[i - 1].errors.map(e => e.error_category === 'other' ? e.error_type : e.error_category)) : new Set();
                for (let cat of categories) {
                    if (i > 0 && prevCategories.has(cat)) continue;
                    let resolved = false;
                    for (let j = i + 1; j < allBuilds.length; j++) {
                        let jCats = new Set(allBuilds[j].errors.map(e => e.error_category === 'other' ? e.error_type : e.error_category));
                        if (!jCats.has(cat)) {
                            let fixTime = (new Date(allBuilds[j].time) - new Date(allBuilds[i].time)) / 1000;
                            if (!fixTimesByCategory[cat]) fixTimesByCategory[cat] = { fixed: [], unfixed: 0, isOther: catOrigin[cat] === 'other' };
                            fixTimesByCategory[cat].fixed.push(fixTime);
                            resolved = true;
                            break;
                        }
                    }
                    if (!resolved) {
                        if (!fixTimesByCategory[cat]) fixTimesByCategory[cat] = { fixed: [], unfixed: 0, isOther: catOrigin[cat] === 'other' };
                        fixTimesByCategory[cat].unfixed++;
                    }
                }
            }
            for (let cat in fixTimesByCategory) {
                let times = fixTimesByCategory[cat].fixed;
                let medianSeconds = null;
                if (times.length > 0) {
                    times.sort((a, b) => a - b);
                    let mid = Math.floor(times.length / 2);
                    medianSeconds = times.length % 2 !== 0 ? times[mid] : (times[mid - 1] + times[mid]) / 2;
                }
                if (!ttfByCategory[cat]) {
                    ttfByCategory[cat] = { fixTimes: [], unfixed: 0, isOther: fixTimesByCategory[cat].isOther };
                }
                if (medianSeconds !== null) ttfByCategory[cat].fixTimes.push(medianSeconds);
                ttfByCategory[cat].unfixed += fixTimesByCategory[cat].unfixed;
            }
        }
    }

    let avgEq = eqValues.length > 0 ? (eqValues.reduce((a, b) => a + b, 0) / eqValues.length) : null;
    let avgRed = redValues.length > 0 ? (redValues.reduce((a, b) => a + b, 0) / redValues.length) : null;
    let avgEqLabel = avgEq !== null ? (avgEq < 0.3 ? 'Low' : avgEq < 0.6 ? 'Medium' : 'High') : '';

    let summaryHtml = `
        <div class="d-flex flex-wrap" style="gap:16px; margin-bottom:20px;">
            <div class="stat-item"><strong>${totalStudents}</strong><br><small>Students</small></div>
            <div class="stat-item"><strong>${avgEq !== null ? avgEq.toFixed(3) + ' (' + avgEqLabel + ')' : 'N/A'}</strong><br><small>Avg EQ</small></div>
            <div class="stat-item"><strong>${avgRed !== null ? avgRed.toFixed(3) : 'N/A'}</strong><br><small>Avg RED</small></div>
            <div class="stat-item"><strong>${totalCompileErrors}</strong><br><small>Compile Errors</small></div>
            <div class="stat-item"><strong>${totalRuntimeErrors}</strong><br><small>Runtime Errors</small></div>
        </div>`;

    // Helper to build an error category table
    function buildErrorTable(catObj, otherTypesObj, collapseIdPrefix, title) {
        let arr = [];
        for (let cat in catObj) {
            arr.push({
                category: cat,
                count: catObj[cat].count,
                studentCount: catObj[cat].students.size,
                pct: (catObj[cat].students.size / totalStudents * 100).toFixed(0)
            });
        }
        arr.sort((a, b) => b.count - a.count);
        if (arr.length === 0) return '';

        let visibleRows = '';
        let hiddenRows = '';
        for (let i = 0; i < arr.length; i++) {
            let e = arr[i];
            let row;
            if (e.category === 'other' && otherTypesObj && Object.keys(otherTypesObj).length > 0) {
                let otherList = '<table class="table table-sm table-hover mb-0" style="font-size:12px;">'
                    + '<thead><tr><th>Error Type</th><th>Count</th><th>Students</th></tr></thead><tbody>'
                    + Object.entries(otherTypesObj)
                        .sort((a, b) => b[1].count - a[1].count)
                        .map(([type, data]) => `<tr><td>${sanitizeName(type)}</td><td>${data.count}</td><td>${data.students.size}</td></tr>`)
                        .join('')
                    + '</tbody></table>';
                let detailsId = `${collapseIdPrefix}-other-details`;
                row = `<tr><td>${e.category} <a data-toggle="collapse" href="#${detailsId}" style="font-size:11px;">[details]</a>
                    <div class="collapse" id="${detailsId}">${otherList}</div></td>
                    <td>${e.count}</td><td>${e.studentCount}</td><td>${e.pct}%</td></tr>`;
            } else {
                row = `<tr><td>${e.category}</td><td>${e.count}</td><td>${e.studentCount}</td><td>${e.pct}%</td></tr>`;
            }
            if (i < 15) visibleRows += row;
            else hiddenRows += row;
        }
        let showAllBtn = hiddenRows ? `
            <a class="btn btn-sm btn-outline-secondary mt-2" data-toggle="collapse" href="#${collapseIdPrefix}-all">
                Show all (${arr.length})
            </a>` : '';
        return `
            <div class="analysed-panel-btn-block">
                <a class="btn btn-primary" data-toggle="collapse" href="#${collapseIdPrefix}">
                    ${title} (${arr.length} categories)
                </a>
                <div class="collapse" id="${collapseIdPrefix}">
                    <div class="card card-body">
                        <table class="table table-sm table-hover">
                            <thead><tr><th>Error Category</th><th>Occurrences</th><th>Students</th><th>% of Class</th></tr></thead>
                            <tbody>${visibleRows}</tbody>
                        </table>
                        ${hiddenRows ? `<div class="collapse" id="${collapseIdPrefix}-all">
                            <table class="table table-sm table-hover"><tbody>${hiddenRows}</tbody></table>
                        </div>${showAllBtn}` : ''}
                    </div>
                </div>
            </div>`;
    }

    let compileErrorsHtml = buildErrorTable(compileErrorCats, otherCompileTypes, 'collapseCompileErrors-overview', 'Most Common Compile Errors');
    let runtimeErrorsHtml = buildErrorTable(runtimeErrorCats, otherRuntimeTypes, 'collapseRuntimeErrors-overview', 'Most Common Runtime Errors');

    // Hardest Errors to Fix table
    let ttfArray = [];
    for (let cat in ttfByCategory) {
        let times = ttfByCategory[cat].fixTimes;
        let medianSeconds = null;
        let totalOccurrences = times.length + ttfByCategory[cat].unfixed;
        if (times.length > 0) {
            times.sort((a, b) => a - b);
            let mid = Math.floor(times.length / 2);
            medianSeconds = times.length % 2 !== 0 ? times[mid] : (times[mid - 1] + times[mid]) / 2;
        }
        ttfArray.push({
            category: cat,
            medianSeconds: medianSeconds,
            count: totalOccurrences,
            unfixed: ttfByCategory[cat].unfixed,
            isOther: ttfByCategory[cat].isOther
        });
    }
    ttfArray.sort((a, b) => {
        if (a.medianSeconds === null && b.medianSeconds === null) return 0;
        if (a.medianSeconds === null) return 1;
        if (b.medianSeconds === null) return -1;
        return b.medianSeconds - a.medianSeconds;
    });

    // merge all "other" time-to-fix entries into one row for the class view (having the student specific "other" errors messes with aggregate view)
    // keep top 10 by fix time in a details dropdown
    let otherTtf = ttfArray.filter(t => t.isOther);
    let normalTtf = ttfArray.filter(t => !t.isOther);
    if (otherTtf.length > 0) {
        let allTimes = otherTtf.filter(e => e.medianSeconds !== null).map(e => e.medianSeconds);
        let otherMedian = null;
        if (allTimes.length > 0) {
            allTimes.sort((a, b) => a - b);
            let mid = Math.floor(allTimes.length / 2);
            otherMedian = allTimes.length % 2 !== 0 ? allTimes[mid] : (allTimes[mid - 1] + allTimes[mid]) / 2;
        }
        normalTtf.push({
            category: 'other', medianSeconds: otherMedian,
            count: otherTtf.reduce((s, e) => s + e.count, 0),
            unfixed: otherTtf.reduce((s, e) => s + e.unfixed, 0),
            isOther: false,
            otherDetails: otherTtf.sort((a, b) => (b.medianSeconds || 0) - (a.medianSeconds || 0)).slice(0, 10)
        });
        ttfArray = normalTtf;
        ttfArray.sort((a, b) => {
            if (a.medianSeconds === null && b.medianSeconds === null) return 0;
            if (a.medianSeconds === null) return 1;
            if (b.medianSeconds === null) return -1;
            return b.medianSeconds - a.medianSeconds;
        });
    }

    let hardestErrorsHtml = '';
    if (ttfArray.length > 0) {
        let ttfRowsHtml = '';
        for (let t of ttfArray) {
            let medianDisplay = t.medianSeconds !== null ? formatSeconds(t.medianSeconds) : '—';
            let categoryDisplay = t.category;
            if (t.otherDetails && t.otherDetails.length > 0) {
                let detailRows = t.otherDetails.map(d =>
                    `<tr><td>${sanitizeName(d.category)}</td><td>${d.medianSeconds !== null ? formatSeconds(d.medianSeconds) : '—'}</td><td>${d.count}</td></tr>`
                ).join('');
                let detailTable = '<table class="table table-sm mb-0" style="font-size:12px;">'
                    + '<thead><tr><th>Error</th><th>Median Fix Time</th><th>Occurrences</th></tr></thead>'
                    + '<tbody>' + detailRows + '</tbody></table>';
                categoryDisplay = `other <a data-toggle="collapse" href="#collapseTtfOther-overview" style="font-size:11px;">[details]</a>
                    <div class="collapse" id="collapseTtfOther-overview">${detailTable}</div>`;
            }
            ttfRowsHtml += `<tr><td>${categoryDisplay}</td><td>${medianDisplay}</td><td>${t.count}</td><td>${t.unfixed > 0 ? t.unfixed : ''}</td></tr>`;
        }
        hardestErrorsHtml = `
            <div class="analysed-panel-btn-block">
                <a class="btn btn-primary" data-toggle="collapse" href="#collapseHardestErrors-overview">
                    Hardest Errors to Fix
                </a>
                <div class="collapse" id="collapseHardestErrors-overview">
                    <div class="card card-body">
                        <p>Class-wide median time-to-fix per error category, aggregated across all students.</p>
                        <table class="table table-sm table-hover">
                            <thead><tr><th>Error Category</th><th>Median Fix Time</th><th>Occurrences</th><th>Unfixed</th></tr></thead>
                            <tbody>${ttfRowsHtml}</tbody>
                        </table>
                    </div>
                </div>
            </div>`;
    }

    // Students by EQ table
    studentRows.sort((a, b) => {
        if (a.eq === null && b.eq === null) return 0;
        if (a.eq === null) return 1;
        if (b.eq === null) return -1;
        return b.eq - a.eq;
    });

    window._overviewStudentRows = studentRows;
    let studentRowsHtml = renderStudentTableRows(studentRows);

    let studentsTableHtml = `
        <div class="analysed-panel-btn-block">
            <a class="btn btn-primary" data-toggle="collapse" href="#collapseStudentEq-overview">
                Students by EQ Score (${studentRows.length})
            </a>
            <div class="collapse" id="collapseStudentEq-overview">
                <div class="card card-body">
                    <table class="table table-sm table-hover" id="student-overview-table">
                        <thead><tr>
                            <th>Student</th>
                            <th style="cursor:pointer;" onclick="sortStudentTable('eq')">EQ</th>
                            <th style="cursor:pointer;" onclick="sortStudentTable('red')">RED</th>
                            <th style="cursor:pointer;" onclick="sortStudentTable('failedBuilds')">Failed Builds</th>
                            <th style="cursor:pointer;" onclick="sortStudentTable('compileErrors')">Compile Errors</th>
                        </tr></thead>
                        <tbody id="student-overview-tbody">${studentRowsHtml}</tbody>
                    </table>
                </div>
            </div>
        </div>`;

    // Build the overview 
    let overviewHtml = `
        <div id="class-overview" class="card mb-4" style="display:none;">
            <div class="card-header bg-primary text-white">
                <h5 class="mb-0">Error Overview</h5>
            </div>
            <div class="card-body">
                ${summaryHtml}
                ${compileErrorsHtml}
                ${runtimeErrorsHtml}
                ${hardestErrorsHtml}
                ${studentsTableHtml}
            </div>
        </div>`;

    $('#log-analysis-results').prepend(overviewHtml);
    $('#class-overview-btn').prop('disabled', false);
    showClassOverview();
}

// Shows overview panel and hides individual student panels 
function showClassOverview() {
    $('.tab-pane').removeClass('show active');
    $('.failid.active').removeClass('active');
    $('#class-overview').show();
    $('#class-overview-btn').addClass('active');
    $(window).scrollTop(0);
}

// Navigates to a students individual analysis  
function scrollToStudent(entryId) {
    $('#class-overview').hide();
    $('#class-overview-btn').removeClass('active');
    let listItem = $('[aria-controls="' + entryId + '"]');
    if (listItem.length) {
        let parentCollapse = listItem.closest('.student-folder-files');
        if (parentCollapse.length && !parentCollapse.hasClass('show')) {
            parentCollapse.collapse('show');
        }
        listItem.click();
        listItem[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function renderStudentTableRows(rows) {
    let html = '';
    for (let s of rows) {
        let eqDisplay = s.eq !== null ? s.eq.toFixed(3) : '';
        let redDisplay = s.red !== null ? s.red.toFixed(3) : '';
        let nameLink = `<a href="#" onclick="scrollToStudent('${s.entryId}'); return false;" style="text-decoration:underline;">${s.name}</a>`;
        html += `<tr>
            <td>${nameLink}</td><td>${eqDisplay}</td><td>${redDisplay}</td>
            <td>${s.failedBuilds}</td><td>${s.compileErrors}</td>
        </tr>`;
    }
    return html;
}

function sortStudentTable(col) {
    let rows = window._overviewStudentRows;
    rows.sort((a, b) => {
        let va = a[col], vb = b[col];
        if (va === null && vb === null) return 0;
        if (va === null) return 1;
        if (vb === null) return -1;
        return vb - va;
    });
    $('#student-overview-tbody').html(renderStudentTableRows(rows));
}

function getLogFile() {
    if ($("#input-log-type")[0].checked) { //File input
        return $("#file-input");
    } else { //Folder input
        return $("#folder-input");
    }
}

/**
 * Analyse button was clicked
 */
function fileSubmit(){
    var logInput = getLogFile();

    if( logInput.val()==''){
        alert("No file entered!");
        return;
    }
    clearAnalysisResults();
    toggleChooseLogs();
    showSidebar();
    $("#analysis-result-actions").removeClass("d-none");
    files=[];
    errorAnalysing=[];
    csvValues=[];
    errorAnalysing=[];
    pendingAnalyses=0;
    similarityDataAllFiles={};
    $('#alert-expand-control').alert('close');
    $('#compare-button').prop('disabled', true);

    for(i=0;i<logInput[0].files.length;i++){
        if (logInput[0].files[i].type==='text/plain' && logInput[0].files[i].name.includes(".txt")){ //if text file
            pendingAnalyses++;
            readObject( logInput[0].files[i], i,"analyse","",false);
        }else if (supportedArchiveTypes.includes(logInput[0].files[i].type)){ //if zip file
            pendingAnalyses++;
            parseZipFile( i, logInput[0].files[i], logInput[0].files[i].webkitRelativePath);
        }else{ //wrong type
            if(!logInput[0].files[i].name.includes("veebitekst.html")){
                errorAnalysing.push( sanitizeName(logInput[0].files[i].name));
            }
        }
    }

    setTimeout(() => {
        if(errorAnalysing.length>0){
            var tableErrors=`
            <div id='alert-expand-control' class="alert alert-warning alert-dismissible fade show"
            data-toggle="collapse" href="#alert-expand-body" aria-expanded="false" aria-controls="alert-expand-body" role="alert">
                <strong >Errors analysing files</strong>
                <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                </button>
                <div id="alert-expand-body" class="collapse">
                    <hr>
                    <ul id="alert-error-list" class="scroll-auto">
                    </ul>
                </div>
            </div>`;
            $("#alert-expand-control").remove();
            $('body').append(tableErrors);
            for(let i=0;i<errorAnalysing.length;i++){
                $('#alert-error-list').append(`<li>${errorAnalysing[i]}</li>`);
            }
        }
    }, 3000);

}

function onAnalysisComplete(){
    pendingAnalyses--;
    if(pendingAnalyses===0){
        $('#compare-button').prop('disabled', false);
        if($("#input-analysis-type")[0].checked && csvValues.length > 0) {
            generateClassOverview();
        }
    }
}


/** Zipfiles are recursively read and sent to be analysed
 * 
 * @param {*} entryId - unique identifier
 * @param {*} zipFile - zipFile object
 * @param {*} path - path to current zipFile object
 */
function parseZipFile(entryId, zipFile, path=''){
    let new_zip = new JSZip(); //new instance
    new_zip.loadAsync(zipFile)
    .then(function(zip) {
        let files = zip.file(/.*/); //all files in array ZipObjects
        for (let i=0;i<files.length;i++){
            if( RegExp('\.txt').test(files[i].name)){ //text file
                pendingAnalyses++;
                readObject( files[i], entryId+'-'+i, "analyse", path, true);
            }else if(RegExp('\.zip').test(files[i].name)){
                pendingAnalyses++;
                files[i].async("blob")
                .then(function (file) {
                    if(path!==''){
                        path+='/';
                    }
                    parseZipFile(entryId+'-'+i, file, path+files[i].name);
                });
            }else{
                if(! RegExp('veebitekst\.html').test(files[i].name)){ //not veebitekst\.html
                    errorAnalysing.push( sanitizeName(path+'/'+files[i].name));
                }
            }
        }
        onAnalysisComplete();
    });
}


function storeFileInfo(entryId, file, type, text) {
    if(!(file.hasOwnProperty("_data"))){
        file._data = { crc32: CRC32.str(text)};
    }
    if(!(entryId in files)){
        files[entryId] = {"file": file, "type": type, "entryId": entryId};
    }
}

function sanitizeObjectProperties(obj) {
    Object.keys(obj).forEach((prop) => {
        if (typeof obj[prop] === 'string') {
            obj[prop] = sanitizeName(obj[prop]);
        }
    });
}

function sanitizeText(inputText) {
    return inputText.replaceAll('<', '«').replaceAll('>', '»');
}

function sanitizeName(inputText) {
    return inputText.replace(/[<>]/g, '');
}

function getJsonLog(text) {
    if(text.startsWith("{")){
        return JSON.parse(`[${text.slice(0, text.lastIndexOf("}")+1)}]`);
    }
    return JSON.parse(text);
}

/**
 * @param {*} file - file object
 * @param {String} entryId - id of file analysed
 * @param {*} type - describes what to do with read object
 * @param {*} path - path of current file
 * @param {boolean} isZipObject - describes wether file object is zip object
 */
function readObject(file, entryId, type="analyse", path='', isZipObject = false){
    sanitizeObjectProperties(file);
    path = sanitizeName(path);
    if (isZipObject){
        file.async("uint8array")
        .then(function success(uint8Array) {
            try {
                text = decoder.decode(uint8Array);
                storeFileInfo(entryId, file, "zip", text);
                handleObject( getJsonLog( sanitizeText(text)), file, entryId, path, isZipObject, type);
            } catch (e){
                console.log(e);
                if(type=="analyse"){
                    errorAnalysing.push(path+file.name);
                }
                return;
            }
        });
    }else{  //is not zip object
        if(file.type==='text/plain'){
            const reader = new FileReader();
            reader.readAsText(file);
            reader.addEventListener('load', (event) => {
                const text = event.target.result;
                try{
                    storeFileInfo(entryId, file, "text", text);
                    handleObject( getJsonLog( sanitizeText(text)), file, entryId, path, isZipObject, type);
                } catch (e){ 
                    console.log(e);
                    if(type=="analyse"){
                        errorAnalysing.push(path+file.name);
                    }
                    return;
                }
              });
        }else{
            alert("Enter text file!");
        }
    }
}


/**
 * 
 * @param {JSON} jsonLog - log content
 * @param {*} file - file object
 * @param {*} entryId - id of file analysed
 * @param {*} path - path of current file
 * @param {*} isZipObject - describes wether file object is zip object
 * @param {*} type - describes what to do with read object
 */
function handleObject(jsonLog, file, entryId, path, isZipObject, type){
    if (type==="analyse"){
        analyse( jsonLog, file, entryId, path, isZipObject);
    }else if(["replayer", "textGraph", "csvAnalytics","similarityAnalysis"].includes(type)){
        parseLogFile(jsonLog, type, entryId);
    }
}


/** analyses give jsonlog and add analysation content
 * 
 * @param {*} jsonLog - log content
 * @param {*} file - file object
 * @param {*} entryId - id of file analysed
 * @param {*} path - path of current file
 * @param {*} isZipObject - describes wether file object is zip object
 */
function analyse(jsonLog, file, entryId, path='', isZipObject = false){
    const startTime=new Date(jsonLog[0].time);
    const endTime=new Date(jsonLog[jsonLog.length-1].time);
    const elapsedDate=new Date(endTime-startTime);
    let elapsedTime=elapsedDate.toISOString().slice(11, -5).split(":");
    elapsedTime=elapsedTime[0].concat("h, ",elapsedTime[1],"min, ",elapsedTime[2],"sec");
    if(elapsedDate.getDate()>1){
        elapsedTime=(elapsedDate.getDate()-1).toString().concat(" days, ", elapsedTime)
    }

    let errors = {
        total : 0,
        syntaxError: 0,
        typeError: 0,
        nameError: 0,
        valueError: 0,
        attributeError: 0,
        texts: {}
    }
    let runCount=0;
    let pasted={
        total:0,
        characterCount:0,
        texts: {}
    }
    let debugCount=0;
    let filesCreated=new Set();
    let filesRan=new Set();
    let filesOpened=new Set();
    let builds=[];
    let runs=[];
    let errorEvents=[];
    let buildCount=0;
    let buildErrorCount=0;
    for(let i=0;i<jsonLog.length;i++){
        if(jsonLog[i].sequence==='ShellCommand'
            && jsonLog[i].command_text.slice(0,4)==='%Run'){
            runCount++;
            if(!jsonLog[i].command_text.includes('$EDITOR_CONTENT')){
                filesRan.add(jsonLog[i].command_text.slice(5).replaceAll('\'',''));
            }
        }
        if(jsonLog[i].sequence==='TextInsert'
            && jsonLog[i].text_widget_class==="ShellText"
            && /Error|Exception/.test(jsonLog[i].text) ){
            errors.total++;
            switch(jsonLog[i].text.split(":")[0]){
                case "SyntaxError": errors.syntaxError++; break;
                case "TypeError": errors.typeError++; break;
                case "NameError": errors.nameError++; break;
                case "ValueError": errors.valueError++; break;
                case "AttributeError": errors.attributeError++; break;
            }
            let date=getDateAsLocaleString(jsonLog[i].time)
            errors.texts[date]=jsonLog[i].text;
        }
        if(jsonLog[i].sequence==='TextInsert' && jsonLog[i].text.includes('Debug')
            || jsonLog[i].sequence==='ShellCommand' && jsonLog[i].command_text.includes('%Debug')){
            debugCount++;
        }
        if(jsonLog[i].sequence.includes('Paste')
            && jsonLog[i].text_widget_class!=null
            && jsonLog[i].text_widget_class.includes("CodeViewText")){
            pasted.total++;
            if(jsonLog[i+1].text!=null){
                pasted.characterCount+=jsonLog[i+1].text.length;
                pasted.texts[getDateAsLocaleString(jsonLog[i+1].time)]='<pre>'.concat(jsonLog[i+1].text,'</pre>');
            }
        }
        if(jsonLog[i].sequence==='fileCreated'){
            filesCreated.add(jsonLog[i].filename);
        }
        if(jsonLog[i].sequence==='Open'){
            if (jsonLog[i].filename.includes('\\')) {
                let filename=jsonLog[i].filename.split('\\');
                filesOpened.add(filename[filename.length-1]);
            }
            filesOpened.add(jsonLog[i].filename);
        }
        if(jsonLog[i].sequence==='BuildStart'){
            buildCount++;
            builds.push({
                build_id: jsonLog[i].build_id,
                time: jsonLog[i].time,
                success: null,
                error_count: 0,
                warning_count: 0,
                errors: []
            });
        }
        if(jsonLog[i].sequence==='BuildEnd'){
            let build = builds.find(b => b.build_id === jsonLog[i].build_id);
            if(build){
                build.success = jsonLog[i].success;
                build.error_count = jsonLog[i].error_count;
                build.warning_count = jsonLog[i].warning_count;
            }
            if(jsonLog[i].success === false){
                buildErrorCount++;
            }
        }
        if(jsonLog[i].sequence==='RunStart'){
            runCount++;
            runs.push({
                run_id: jsonLog[i].run_id,
                time: jsonLog[i].time,
                filename: jsonLog[i].filename,
                exitCode: null,
                errors: []
            });
        }
        if(jsonLog[i].sequence==='RunEnd'){
            let run = runs.find(r => r.run_id === jsonLog[i].run_id);
            if(run){
                let exitMatch = jsonLog[i].message ? jsonLog[i].message.match(/exitCode=(\d+)/) : null;
                run.exitCode = exitMatch ? parseInt(exitMatch[1]) : null;
            }
        }
        if(jsonLog[i].sequence==='ErrorNormalized'){
            errorEvents.push(jsonLog[i]);
            // Only count actual errors (not warnings) for metrics
            if(jsonLog[i].severity === 'error'){
                if(jsonLog[i].build_id){
                    let build = builds.find(b => b.build_id === jsonLog[i].build_id);
                    if(build){
                        build.errors.push(jsonLog[i]);
                    }
                }
                if(jsonLog[i].run_id){
                    let run = runs.find(r => r.run_id === jsonLog[i].run_id);
                    if(run){
                        run.errors.push(jsonLog[i]);
                    }
                }
            }
        }
    }

    // build a lookup of which error_type values came from "other" category
    // we use error_type for "other" in metrics to avoid lumping different errors together,
    // but we need to know which ones to display as "other [details]" in the UI
    let otherErrorTypes = new Set();
    for (let b of builds) {
        for (let e of b.errors) {
            if (e.error_category === 'other') otherErrorTypes.add(e.error_type);
        }
    }

    // EQ (Error Quotient) — Jadud 2006
    // Algorithm reference: Price et al. (2020), https://github.com/thomaswp/ProgSnap2Analysis/blob/master/eq.py, adapted for PALG logs
    let eqScore = null;

    // extract compile pairs — consecutive pairs from all builds
    let compile_pairs = [];
    for (let i = 0; i < builds.length - 1; i++) {
        compile_pairs.push([i, i + 1]);
    }

    // minimum 5 builds to compute eq/red, unless last build failed (student gave up with unresolved errors)
    let lastBuildFailed = builds.length > 0 && builds[builds.length - 1].success === false;
    let enoughBuilds = builds.length >= 5 || (builds.length >= 2 && lastBuildFailed);

    if (compile_pairs.length > 0 && enoughBuilds) {
        let score = 0;
        for (let pair of compile_pairs) {
            let e1 = pair[0];
            let e2 = pair[1];

            let e1_errors = builds[e1].errors;
            let e2_errors = builds[e2].errors;

            let score_delta = 0;
            if (e1_errors.length > 0 && e2_errors.length > 0) {
                // If both compiles resulted in errors, add 8 to the score
                score_delta += 8;

                // Get the set of errors shared by both compiles
                let e1_types = new Set(e1_errors.map(e => e.error_category === 'other' ? e.error_type : e.error_category));
                let e2_types = new Set(e2_errors.map(e => e.error_category === 'other' ? e.error_type : e.error_category));
                let shared_errors = new Set([...e1_types].filter(x => e2_types.has(x)));
                if (shared_errors.size > 0) {
                    score_delta += 3;
                }
            }
            score += score_delta / 11;
        }
        eqScore = score / compile_pairs.length;
    }

    // RED (Repeated Error Density) — Becker 2016
    // Algorithm reference: Price et al. (2020), https://github.com/thomaswp/ProgSnap2Analysis/blob/master/red.py, adapted for PALG logs
    let redScore = null;
    let redDetails = [];

    if (builds.length >= 2 && enoughBuilds) {
        let red = 0;
        let divisor = 0;
        let repeated = 0;
        let categoryRepeatCount = {};
        for (let i = 1; i < builds.length; i++) {
            divisor += 1;

            let e1_errors = builds[i - 1].errors;
            let e2_errors = builds[i].errors;

            let e1_types = new Set(e1_errors.map(e => e.error_category === 'other' ? e.error_type : e.error_category));
            let e2_types = new Set(e2_errors.map(e => e.error_category === 'other' ? e.error_type : e.error_category));
            let shared_errors = new Set([...e1_types].filter(x => e2_types.has(x)));

            if (shared_errors.size > 0) {
                // If there is a shared error, increment the r count
                repeated = repeated + 1;
                for (let c of shared_errors) {
                    categoryRepeatCount[c] = (categoryRepeatCount[c] || 0) + 1;
                }
            } else {
                // Otherwise, there was a new error or no errors, so add to RED and reset
                if (repeated > 0) {
                    red += (repeated ** 2) / (repeated + 1);
                }
                repeated = 0;
            }
        }

        if (repeated > 0) {
            red += (repeated ** 2) / (repeated + 1);
        }

        if (divisor === 0) {
            redScore = null;
        } else {
            // Normalize by number of consecutive pairs 
            red = red / divisor;
            redScore = red;
        }

        for (let cat in categoryRepeatCount) {
            redDetails.push({ category: cat, repeats: categoryRepeatCount[cat] });
        }
        redDetails.sort((a, b) => b.repeats - a.repeats);
        // tag entries that came from "other" so we can display them nicely
        for (let d of redDetails) {
            d.isOther = otherErrorTypes.has(d.category);
        }
    }

    // Time-to-Fix — Altadmri & Brown (2015)
    // For each error_category appearing in a build, scan forward until it disappears
    let timeToFix = [];
    if (builds.length >= 2) {
        // Collect all fix times grouped by category
        let fixTimesByCategory = {};
        for (let i = 0; i < builds.length; i++) {
            let categories = new Set(builds[i].errors.map(e => e.error_category === 'other' ? e.error_type : e.error_category));
            // Skip builds with no errors
            if (categories.size === 0) continue;
            // For each category in this build, check if it's a new appearance
            let prevCategories = i > 0 ? new Set(builds[i - 1].errors.map(e => e.error_category === 'other' ? e.error_type : e.error_category)) : new Set();
            for (let cat of categories) {
                if (i > 0 && prevCategories.has(cat)) continue; // continuation, not new appearance
                // New appearance of this category, scan forward for resolution
                let resolved = false;
                for (let j = i + 1; j < builds.length; j++) {
                    let jCategories = new Set(builds[j].errors.map(e => e.error_category === 'other' ? e.error_type : e.error_category));
                    if (!jCategories.has(cat)) {
                        // Resolved at build j
                        let fixTime = (new Date(builds[j].time) - new Date(builds[i].time)) / 1000;
                        if (!fixTimesByCategory[cat]) fixTimesByCategory[cat] = { fixed: [], unfixed: 0 };
                        fixTimesByCategory[cat].fixed.push(fixTime);
                        resolved = true;
                        break;
                    }
                }
                if (!resolved) {
                    // Never fixed during session
                    if (!fixTimesByCategory[cat]) fixTimesByCategory[cat] = { fixed: [], unfixed: 0 };
                    fixTimesByCategory[cat].unfixed++;
                }
            }
        }
        // Compute median for each category
        for (let cat in fixTimesByCategory) {
            let times = fixTimesByCategory[cat].fixed;
            let medianSeconds = null;
            if (times.length > 0) {
                times.sort((a, b) => a - b);
                let mid = Math.floor(times.length / 2);
                medianSeconds = times.length % 2 !== 0 ? times[mid] : (times[mid - 1] + times[mid]) / 2;
            }
            timeToFix.push({
                category: cat,
                count: times.length + fixTimesByCategory[cat].unfixed,
                medianSeconds: medianSeconds,
                unfixedCount: fixTimesByCategory[cat].unfixed
            });
        }
        timeToFix.sort((a, b) => {
            // Sort by median fix time descending, unfixed-only entries last
            if (a.medianSeconds === null && b.medianSeconds === null) return 0;
            if (a.medianSeconds === null) return 1;
            if (b.medianSeconds === null) return -1;
            return b.medianSeconds - a.medianSeconds;
        });
        // same tagging for time-to-fix entries
        for (let t of timeToFix) {
            t.isOther = otherErrorTypes.has(t.category);
        }
    }

    var generalInfo={
        'Start time':startTime.toLocaleString('en-GB'),
        'End time':endTime.toLocaleString('en-GB'),
        'Elapsed time':elapsedTime,
        'Run count':runCount,
        'Error count':errors.total,
        'Paste text count':pasted.total,
        'Debug count':debugCount,
        'Files created':[...filesCreated].join('<br>'),
        'Files ran':[...filesRan].join('<br>'),
        'Files opened':[...filesOpened  ].join('<br>')
    }

    let compileErrorCount = errorEvents.filter(e => e.phase === 'compile' && e.severity === 'error').length;
    let runtimeErrorCount = errorEvents.filter(e => e.phase === 'runtime' && e.severity === 'error').length;
    if(buildCount > 0){
        generalInfo['Build count'] = buildCount;
        generalInfo['Failed builds'] = buildErrorCount;
        generalInfo['Compile errors'] = compileErrorCount;
        generalInfo['Runtime errors'] = runtimeErrorCount;
    }
    if (eqScore !== null) {
        let eqLabel = eqScore < 0.3 ? 'Low' : eqScore < 0.6 ? 'Medium' : 'High';
        generalInfo['EQ (Error Quotient)'] = eqScore.toFixed(3) + ' (' + eqLabel + ')';
    }
    if (redScore !== null) {
        generalInfo['RED (Repeated Error Density)'] = redScore.toFixed(3);
    }
    if (timeToFix.length > 0) {
        let allFixedTimes = timeToFix.filter(t => t.medianSeconds !== null).map(t => t.medianSeconds);
        if (allFixedTimes.length > 0) {
            allFixedTimes.sort((a, b) => a - b);
            let mid = Math.floor(allFixedTimes.length / 2);
            let overallMedian = allFixedTimes.length % 2 !== 0 ? allFixedTimes[mid] : (allFixedTimes[mid - 1] + allFixedTimes[mid]) / 2;
            generalInfo['Median time-to-fix'] = overallMedian.toFixed(1) + 's';
        }
    }

    let errorSummary = {};
    if (errorEvents.length > 0) {
        let compileErrors = {};
        let runtimeErrors = {};
        let otherCompileTypes = {};
        let otherRuntimeTypes = {};
        for (let e of errorEvents) {
            if (e.phase === 'compile') {
                compileErrors[e.error_category] = (compileErrors[e.error_category] || 0) + 1;
                if (e.error_category === 'other') {
                    otherCompileTypes[e.error_type] = (otherCompileTypes[e.error_type] || 0) + 1;
                }
            } else if (e.phase === 'runtime') {
                runtimeErrors[e.error_category] = (runtimeErrors[e.error_category] || 0) + 1;
                if (e.error_category === 'other') {
                    otherRuntimeTypes[e.error_type] = (otherRuntimeTypes[e.error_type] || 0) + 1;
                }
            }
        }
        if (Object.keys(compileErrors).length > 0) {
            errorSummary['<strong>Compile errors</strong>'] = '';
            for (let cat in compileErrors) {
                if (cat === 'other') {
                    let otherList = '<table class="table table-sm mb-0" style="font-size:12px;">'
                        + '<thead><tr><th>Error Type</th><th>Count</th></tr></thead><tbody>'
                        + Object.entries(otherCompileTypes)
                            .sort((a, b) => b[1] - a[1])
                            .map(([type, cnt]) => `<tr><td>${sanitizeName(type)}</td><td>${cnt}</td></tr>`)
                            .join('')
                        + '</tbody></table>';
                    let collapseId = `collapseOtherCompile-${entryId}`;
                    errorSummary[cat] = `${compileErrors[cat]} <a data-toggle="collapse" href="#${collapseId}" style="font-size:11px;">[details]</a>
                        <div class="collapse" id="${collapseId}">${otherList}</div>`;
                } else {
                    errorSummary[cat] = compileErrors[cat];
                }
            }
        }
        if (Object.keys(runtimeErrors).length > 0) {
            errorSummary['<strong>Runtime errors</strong>'] = '';
            for (let cat in runtimeErrors) {
                if (cat === 'other') {
                    let otherList = '<table class="table table-sm mb-0" style="font-size:12px;">'
                        + '<thead><tr><th>Error Type</th><th>Count</th></tr></thead><tbody>'
                        + Object.entries(otherRuntimeTypes)
                            .sort((a, b) => b[1] - a[1])
                            .map(([type, cnt]) => `<tr><td>${sanitizeName(type)}</td><td>${cnt}</td></tr>`)
                            .join('')
                        + '</tbody></table>';
                    let collapseId = `collapseOtherRuntime-${entryId}`;
                    errorSummary[cat] = `${runtimeErrors[cat]} <a data-toggle="collapse" href="#${collapseId}" style="font-size:11px;">[details]</a>
                        <div class="collapse" id="${collapseId}">${otherList}</div>`;
                } else {
                    errorSummary[cat] = runtimeErrors[cat];
                }
            }
        }
    }

    // Build history timeline rows
    let buildHistoryHtml = '';
    if (builds.length > 0) {
        for (let b of builds) {
            let time = getDateAsLocaleString(b.time);
            let status = b.success === true ? 'Success' : b.success === false ? 'Failed' : '? Unknown';
            let statusClass = b.success === true ? 'text-success' : b.success === false ? 'text-danger' : '';
            let details = '';
            if (b.error_count > 0) {
                let categories = b.errors.map(e => e.error_category).join(', ');
                details = `${b.error_count} error(s): ${categories}`;
            }
            if (b.warning_count > 0) {
                details += (details ? ', ' : '') + `${b.warning_count} warning(s)`;
            }
            buildHistoryHtml += `<tr>
                <td>${time}</td>
                <td class="${statusClass}"><strong>${status}</strong></td>
                <td>${details}</td>
            </tr>`;
        }
    }

    var idGeneralInfo=`tableGeneralInfo-${entryId}`;
    var idCopyPaste=`tableCopyPaste-${entryId}`;

    var tableGeneralInfo=`
                <div class="table-container" id="general-info-block">
                    <table class="table" id='${idGeneralInfo}'>
                        <thead class="thead-light">
                            <tr>
                            <th scope="colgroup" colspan="2">General Info</th>
                            </tr>
                        </thead>
                        <tbody>
                        </tbody>
                    </table>
                </div>`;
    var tableCopyPaste=`
            <div class="analysed-panel-btn-block" id='copiedTexts-${entryId}'>
                <a class="btn btn-primary" data-toggle="collapse" href="#collapseCopyPaste-${entryId}" role="button" aria-expanded="false" aria-controls="collapseCopyPaste-${entryId}">
                Pasted texts (${pasted.total})
                </a>
                <div class="collapse" id="collapseCopyPaste-${entryId}">
                    <div class="card card-body">
                        <table class="table" id='${idCopyPaste}'>
                        <tbody>
                            
                        </tbody>
                        </table>  
                    </div>
                </div>
            </div>`;

    var idErrorSummary = `tableErrorSummary-${entryId}`;
    var tableErrorSummary = '';
    if (errorEvents.length > 0) {
        tableErrorSummary = `
            <div class="analysed-panel-btn-block" id='errorSummary-${entryId}'>
                <a class="btn btn-primary" data-toggle="collapse" href="#collapseErrorSummary-${entryId}" role="button" aria-expanded="false" aria-controls="collapseErrorSummary-${entryId}">
                Error Summary (${errorEvents.length})
                </a>
                <div class="collapse" id="collapseErrorSummary-${entryId}">
                    <div class="card card-body">
                        <table class="table" id='${idErrorSummary}'>
                        <tbody>

                        </tbody>
                        </table>
                    </div>
                </div>
            </div>`;
    }

    var tableBuildHistory = '';
    if (builds.length > 0) {
        tableBuildHistory = `
            <div class="analysed-panel-btn-block" id='buildHistory-${entryId}'>
                <a class="btn btn-primary" data-toggle="collapse" href="#collapseBuildHistory-${entryId}" role="button" aria-expanded="false" aria-controls="collapseBuildHistory-${entryId}">
                Build History (${builds.length})
                </a>
                <div class="collapse" id="collapseBuildHistory-${entryId}">
                    <div class="card card-body">
                        <table class="table table-sm" id='tableBuildHistory-${entryId}'>
                        <thead><tr><th>Time</th><th>Status</th><th>Details</th></tr></thead>
                        <tbody>${buildHistoryHtml}</tbody>
                        </table>
                    </div>
                </div>
            </div>`;
    }

    var tableRedDetails = '';
    if (redDetails.length > 0) {
        let redRowsHtml = '';
        let redOtherIdx = 0;
        for (let d of redDetails) {
            let categoryDisplay;
            // show "other [details]" instead of the raw java error string
            if (d.isOther) {
                let collapseId = `collapseRedOther-${entryId}-${redOtherIdx++}`;
                categoryDisplay = `other <a data-toggle="collapse" href="#${collapseId}" style="font-size:11px;">[details]</a>
                    <div class="collapse" id="${collapseId}"><small>${sanitizeName(d.category)}</small></div>`;
            } else {
                categoryDisplay = d.category;
            }
            redRowsHtml += `<tr>
                <td>${categoryDisplay}</td>
                <td>${d.repeats}</td>
            </tr>`;
        }
        tableRedDetails = `
            <div class="analysed-panel-btn-block" id='redDetails-${entryId}'>
                <a class="btn btn-primary" data-toggle="collapse" href="#collapseRedDetails-${entryId}" role="button" aria-expanded="false" aria-controls="collapseRedDetails-${entryId}">
                RED (Repeated Error Density)
                </a>
                <div class="collapse" id="collapseRedDetails-${entryId}">
                    <div class="card card-body">
                        <p>Overall RED: <strong>${redScore.toFixed(3)}</strong> — normalized by number of compilation pairs. Higher values indicate more consecutive repetition of the same errors (Becker, 2016).</p>
                        <table class="table table-sm">
                        <thead><tr><th>Error Category</th><th>Repeated Pairs</th></tr></thead>
                        <tbody>${redRowsHtml}</tbody>
                        </table>
                    </div>
                </div>
            </div>`;
    }

    // Time-to-Fix panel
    var tableTimeToFix = '';
    if (timeToFix.length > 0) {
        let ttfRowsHtml = '';
        let ttfOtherIdx = 0;
        for (let t of timeToFix) {
            let medianDisplay = t.medianSeconds !== null ? formatSeconds(t.medianSeconds) : '—';
            let categoryDisplay;
            // show "other [details]" instead of the raw java error string
            if (t.isOther) {
                let collapseId = `collapseTtfOther-${entryId}-${ttfOtherIdx++}`;
                categoryDisplay = `other <a data-toggle="collapse" href="#${collapseId}" style="font-size:11px;">[details]</a>
                    <div class="collapse" id="${collapseId}"><small>${sanitizeName(t.category)}</small></div>`;
            } else {
                categoryDisplay = t.category;
            }
            ttfRowsHtml += `<tr>
                <td>${categoryDisplay}</td>
                <td>${t.count}</td>
                <td>${medianDisplay}</td>
                <td>${t.unfixedCount > 0 ? t.unfixedCount : ''}</td>
            </tr>`;
        }
        tableTimeToFix = `
            <div class="analysed-panel-btn-block" id='timeToFix-${entryId}'>
                <a class="btn btn-primary" data-toggle="collapse" href="#collapseTimeToFix-${entryId}" role="button" aria-expanded="false" aria-controls="collapseTimeToFix-${entryId}">
                Time-to-Fix by Error Category
                </a>
                <div class="collapse" id="collapseTimeToFix-${entryId}">
                    <div class="card card-body">
                        <p>Time from an error category's first appearance in a build to its disappearance in a subsequent build.</p>
                        <table class="table table-sm">
                        <thead><tr><th>Error Category</th><th>Occurrences</th><th>Median Fix Time</th><th>Unfixed</th></tr></thead>
                        <tbody>${ttfRowsHtml}</tbody>
                        </table>
                    </div>
                </div>
            </div>`;
    }

    var replayerButton=`
            <div class="analysed-panel-btn-block">
                <button id="btn-open-replayer-${entryId}" class="btn btn-primary btn-replayer" data-toggle="modal" data-target="#replayerModal" data-entry-id="${entryId}">
                    Open Replayer
                </button>
            </div>
            `;

    var textGraphButton=`
            <div class="analysed-panel-btn-block">
                <button id="btn-open-text-graph-${entryId}" class="btn btn-primary btn-graph" data-toggle="modal" data-target="#textGraphModal" data-entry-id="${entryId}">
                    Open program length graph
                </button>
            </div>
            `;

    var panelId=`list-${entryId}`;
    addLogAnalysisEntry( entryId, panelId, file, isZipObject, path);


    $('#'+panelId).append(tableGeneralInfo);
    $('#'+panelId).append(tableCopyPaste);

    let hasErrorAnalysis = tableErrorSummary || tableBuildHistory || tableRedDetails || tableTimeToFix;
    if (hasErrorAnalysis) {
        let errorAnalysisSection = `
            <div class="analysed-panel-btn-block" id="errorAnalysis-${entryId}">
                <a class="btn btn-primary" data-toggle="collapse" href="#collapseErrorAnalysis-${entryId}"
                   role="button" aria-expanded="false" aria-controls="collapseErrorAnalysis-${entryId}">
                    Error Analysis
                </a>
                <div class="collapse" id="collapseErrorAnalysis-${entryId}">
                    <div class="card card-body error-analysis-section">
                    </div>
                </div>
            </div>`;
        $('#'+panelId).append(errorAnalysisSection);

        let $container = $(`#collapseErrorAnalysis-${entryId} .card-body`);
        if (tableErrorSummary) {
            $container.append(tableErrorSummary);
            displayDataTable(idErrorSummary, errorSummary);
        }
        if (tableBuildHistory) $container.append(tableBuildHistory);
        if (tableRedDetails) $container.append(tableRedDetails);
        if (tableTimeToFix) $container.append(tableTimeToFix);
    }

    $('#'+panelId).append(replayerButton);
    $('#'+panelId).append(textGraphButton);

    displayDataTable(idGeneralInfo,generalInfo);
    displayDataTable(idCopyPaste,pasted.texts);
    $('#btn-open-replayer-'+entryId).click(readAnalysedFile);
    $('#btn-open-text-graph-'+entryId).click(readAnalysedFile);

    let nameObject = getNameObject(file, isZipObject, path);
    let fileAnalysisResults = {
        'entryId':entryId,
        'filename':nameObject.fileName,
        'start time':toISOStringLocalUTCOffset(startTime),
        'end time':toISOStringLocalUTCOffset(endTime),
        'elapsed time': getDateTimeDiff(startTime,endTime),
        'run count':runCount,
        'error count': errors.total,
        'SyntaxError count':errors.syntaxError,
        'TypeError count':errors.typeError,
        'NameError count':errors.nameError,
        'ValueError count':errors.valueError,
        'AttributeError count':errors.attributeError,
        'paste count':pasted.total,
        'pasted character count':pasted.characterCount,
        'debug count':debugCount,
        'files opened count':filesOpened.size,
        'build count':buildCount,
        'failed build count':buildErrorCount,
        'compile error count':compileErrorCount,
        'runtime error count':runtimeErrorCount,
        'EQ score': eqScore !== null ? eqScore.toFixed(3) : '',
        'RED score': redScore !== null ? redScore.toFixed(3) : '',
        'median time-to-fix (s)': timeToFix.length > 0 ? (() => { let t = timeToFix.filter(x => x.medianSeconds !== null).map(x => x.medianSeconds); if (t.length === 0) return ''; t.sort((a,b) => a-b); let m = Math.floor(t.length/2); return (t.length % 2 !== 0 ? t[m] : (t[m-1]+t[m])/2).toFixed(1); })() : '',
        'time solving till first run (for each program)':"",
        'character count before first run (for each program)':"",
        'character count at the end (for each program)':""
    }
    if($("#input-analysis-type")[0].checked){ //multiple student analysis
        fileAnalysisResults = Object.assign({"foldername":nameObject.folderName}, fileAnalysisResults);
        files[entryId]['folderName']=nameObject.folderName;
    }
    csvValues.push(fileAnalysisResults);
    files[entryId]['fileName']=nameObject.fileName;
    files[entryId]['fileAnalysisResults']=fileAnalysisResults;
    files[entryId]['errorAnalysis']={builds, runs, errorEvents};
    files[entryId]['timeToFix'] = timeToFix;
    onAnalysisComplete();
}

/**
 *
 * @param file - file object
 * @param path - path of current file
 */
function getNameObject(file, isZipObject = false, path=''){
    let fileName = (path!=='' ? path+'/' : '') + file.name;
    if (!isZipObject && file.webkitRelativePath!=""){
        fileName=file.webkitRelativePath
    }
    fileName=fileName.replaceAll('_','-');

    let firstFolderIndex= $("#input-log-type")[0].checked ? 0 : 1;
    if(!firstFolderIndex){ //multiple student analysis
        let firstFolder=fileName.split('/')[firstFolderIndex];  //accordion list element id
        let firstFolderList=firstFolder.split(' ');

        let firstFolderName=firstFolder;
        if (firstFolderList.length>1){
            firstFolderName=firstFolderList[0] + ' ' + firstFolderList[1].split('-')[0]; //list element name
        }
        return {'fileName':fileName,
                'folderName':firstFolderName,
                'folderNameId':firstFolderName.replace(/ |\./ig,'-'),
                'multipleStudentId':`student-${firstFolder.replace(/[^a-z0-9-_]/g, '_')}`}
    }else{
        return {'filename':fileName}
    }
}


/** adds log file row to analysed files and creates analysed card
 * 
 * @param {*} entryId - marks unique id for list groups defining attributes
 * @param {*} panelId - id of file analysed
 * @param {*} file  - file object
 * @param {*} isZipObject - describes wether file object is zip object
 * @param {*} path - path of current file
 */
function addLogAnalysisEntry( entryId, panelId, file, isZipObject = false, path=''){
    let tabList = $("#log-analysis-groups");
    let tabPanel = $("#log-analysis-results");
    let typeOfAnalysis=$("#input-analysis-type")[0].checked;
    let nameObject = getNameObject(file, isZipObject, path);

    setActive="";
    setActivePanel="";
    let fileSize=0;
    if (isZipObject){
        fileSize=Math.round(file._data.uncompressedSize/1024);
    }else{
        fileSize=Math.round(file.size/1024);
    }
    files[entryId]['fileSize']=fileSize;
    if(tabList[0].childElementCount===0){//first entry
        setActive="active";    
        setActivePanel="show active";
    }

    var newTabListElement = `<a class="list-group-item list-group-item-action failid ${setActive}" 
                            id="list-${entryId}-list" data-toggle="list" href="#list-${entryId}" role="tab" aria-controls="${entryId}" data-filename="${nameObject.fileName}">
                            <span class="badge badge-primary badge-pill">${fileSize.toString()+'KB'}</span><br>${nameObject.fileName}</a>`;

    var newTabPanelElement = `<div class="tab-pane fade ${setActivePanel}" id="${panelId}" role="tabpanel" aria-labelledby="list-${entryId}-list"></div>`;

    if (typeOfAnalysis){ //Multiple student analysis
        if(tabList[0].childElementCount===0){//first entry
            var accordion=`<div class="accordion" id="multiple-student-list"></div>`;
            tabList.append(accordion);
        }
        tabList=$('#multiple-student-list');

        if( $('#'+nameObject.multipleStudentId).length===0){
            var show = '';
            var expanded = 'false';
            if( $('.list-group-item').length===0){ //first element expanded
                show = 'show';
                expanded = 'true';
            }
            var studentListElementName=`<a id='${nameObject.folderNameId}' class='btn list-group-item list-group-item-action student-name student-name-folder' data-toggle='collapse' data-target='#${nameObject.multipleStudentId}' aria-expanded='${expanded}' aria-controls='${nameObject.multipleStudentId}' tabindex='0'>
                                                ${nameObject.folderName}
                                            </a>`;
            var studentListElementPanel=`<div id="${nameObject.multipleStudentId}" class="student-folder-files collapse ${show}" aria-labelledby="${nameObject.folderName}" data-parent="#multiple-student-list">
                                        </div>`;

            //folder ordering
            let students = $('.student-name-folder');
            if (students.length==0){
                tabList.append(studentListElementName);
                tabList.append(studentListElementPanel);
            }else{ //order
                for(let i=0;i<students.length;i++){
                    if(students[i].id>nameObject.folderNameId){ //current folder is alphapetically higher
                        $(students[i]).before(studentListElementName);
                        $(students[i]).before(studentListElementPanel);
                        break;
                    }
                    if(i==students.length-1){ //last in order
                        tabList.append(studentListElementName);
                        tabList.append(studentListElementPanel);
                        break;
                    }
                }
            }
            //folder ordering end
        }
        tabList=$('#'+nameObject.multipleStudentId);
        $('#'+nameObject.folderNameId).keyup(switchFolder);

    }


    //file ordering
    let orderedFiles = $('.failid');
    if (typeOfAnalysis){ //Multiple student analysis
        orderedFiles = $('#'+nameObject.multipleStudentId+' .failid');
    }  

    if (orderedFiles.length==0){
        tabList.append(newTabListElement);
    }else{ //order
        for(let i=0;i<orderedFiles.length;i++){
            if(orderedFiles[i].dataset.filename>nameObject.fileName){ //current folder is alphapetically higher
                $(orderedFiles[i]).before(newTabListElement);
                break;
            }
            if(i==orderedFiles.length-1){ //last in order
                tabList.append(newTabListElement);
                break;
            }
        }
    }
    //file ordering end
    tabPanel.append(newTabPanelElement);
    
    $(`#list-${entryId}-list`).keyup(switchListItem); //adds event that switches list items when tab pressed
    if (typeOfAnalysis){ //Multiple student analysis
        $(`#list-${entryId}-list`).click(switchListItem);
    }

    if(!$('.failid').first().hasClass('active') && !$('#class-overview').is(':visible')){ //turn first file on
        if (typeOfAnalysis && $('.failid').first().is(":hidden")){ //Multiple student analysis
            $('.student-folder-files.show').removeClass('show');
            $('.student-folder-files').first().addClass('show');
        }
        $('.failid').first().click();
    }
}


/** displays the data given to a table with id given
 * 
 * @param {string} tableId 
 * @param {json object} data 
 */
function displayDataTable( tableId, data){
    const tbody=$('#'+tableId+" tbody");
    tbody.empty();
    for(const key in data){
        if(Array.isArray(data[key])){
            continue;
        }
        tbody.append('<tr><td>'.concat(key,'</td><td>',data[key],'</td></tr>'));
    }
}

/** return date which is converted to en-GB LocaleString
 * 
 * @param {Date} date 
 */
function getDateAsLocaleString(date){
    return new Date(date).toLocaleString('en-GB');
}

function toISOStringLocalUTCOffset( date) {
    date.setTime(date.getTime() - date.getTimezoneOffset() * 60 * 1000)
    return date.toISOString().replace("Z","");
}

function getDateTimeDiff(dateStart, DateEnd){
    let timeDiff=new Date(DateEnd-dateStart);
    return (timeDiff.getDate()-1).toString()+'T'+timeDiff.toISOString().split('T')[1].replace("Z","");
}

function getDateDiffInMinutes(date1, date2) {
    return Math.floor((Math.abs(date2 - date1) / 1000) / 60);
}

// Makes seconds more readable 
function formatSeconds(totalSeconds) {
    let s = Math.round(totalSeconds);
    if (s < 60) return s + 's';
    let m = Math.floor(s / 60);
    let rem = s % 60;
    if (m < 60) return rem > 0 ? m + 'm ' + rem + 's' : m + 'm';
    let h = Math.floor(m / 60);
    m = m % 60;
    return m > 0 ? h + 'h ' + m + 'm' : h + 'h';
}


/**  already analysed file is passed to be read and the type is chosen 
 *  based on what button was clicked
 */
function readAnalysedFile(){

    let entryId=$(this)[0].attributes['data-entry-id'].value

    if (files[entryId]==null){
        alert('File not found in input space.')
    }
    let isZipObject=files[entryId].type=="zip";
    if($(this)[0].attributes['data-target'].value=='#replayerModal'){
        readObject(files[entryId].file, entryId, "replayer", '', isZipObject);
    }else if($(this)[0].attributes['data-target'].value=='#textGraphModal'){
        readObject(files[entryId].file, entryId, "textGraph", '', isZipObject);
    }
}

const reducerStringArray = (accumulator, currentValue) => accumulator + currentValue.replaceAll("\\","").length;
const reducerFiles= (accumulator, currentValue) => accumulator + currentValue.codeViewText.reduce(reducerStringArray,0);

function addedTextAnalytics( logObject, jsonLog, i, replayerFiles, shellText) {
    if (['TextDelete','TextInsert'].includes(jsonLog[i].sequence) && ((new Date(jsonLog[i].time)) - (new Date(jsonLog[i - 1].time))) > 1/*ms*/) {
        logObject['AllFiles'].push({"x": jsonLog[i].time, "y": replayerFiles.reduce(reducerFiles, 0)});
        if (jsonLog[i].text_widget_class == 'ShellText') {
            logObject['ShellText'].push({"x": jsonLog[i].time, "y": shellText.reduce(reducerStringArray, 0)});
        } else {
            let textWidgetId = jsonLog[i].text_widget_id;
            if (!logObject.hasOwnProperty(textWidgetId)) {
                logObject[textWidgetId] = [];
            }
            let indexOfFile = replayerFiles.findIndex(obj => obj.text_widget_id == textWidgetId);
            if (indexOfFile != -1) {
                logObject[textWidgetId].push({
                    "x": jsonLog[i].time,
                    "y": replayerFiles[indexOfFile].codeViewText.reduce(reducerStringArray, 0)
                });
            }
        }
    }
}

/** Parses jsonLog and caches parced log content to jsonLog. 
 * 
 * @param {*} jsonLog - log content
 * @param {*} type - describes what to do with read object
 */
function parseLogFile(jsonLog, type, entryId){
    const eventListGroup=$('#modal-sidebar-event-list');
    if(type=="replayer"){
        eventListGroup.empty();
    }

    let pastedTexts=[];
    textGraphDataLog['AllFiles']=[];
    textGraphDataLog['ShellText']=[];

    let eventList;
    let split='';

    let replayerFiles=[];
    let shellText=[];

    let data=[]

    for(var i=0;i<jsonLog.length;i++){

        [replayerFiles, shellText]=addLogEvent(replayerFiles, shellText, jsonLog, i);

        if(type=="replayer"){
            if(i%logCacheInterval==0){
                jsonLog[i]["analysation_cache"]={"replayerFiles":deepCopy(replayerFiles),"shellText":deepCopy(shellText)};
            }
            const currentDate = new Date(jsonLog[i].time);
            if(i>1){
                split=currentDate-(new Date(jsonLog[i-1].time));
                split=Math.floor(split / 1e3);
                if(split<1){
                    split='';
                }
            }
            
            eventList=`
                        <div id="${'event-list-row-'+i}" class="row event-row event-list-row" data-logfile-object-index="${i}" tabindex="0">
                            <div class="col-5 event-list-name">${sanitizeName(jsonLog[i].text_widget_class === "ShellText" ? "ShellText" : jsonLog[i].sequence)}</div>
                            <div class="col-4 event-list-sec">${currentDate.toLocaleString('en-US', fullOptions)}</div>
                            <div class="col-2 event-list-sec">${split}</div>
                        </div>
                        `;

            eventListGroup.append(eventList);
        }else if(type=="textGraph"){
            addedTextAnalytics( textGraphDataLog, jsonLog, i, replayerFiles, shellText);
        }else if(type=="csvAnalytics"){
            if(i==jsonLog.length-1){
                let index = getIndexOfArrayObjectAcctoProperty(csvValues,"entryId", entryId);
                let timeDiffTillFirstRun=[]; //time solving till first run (for each program)
                let charCountAtFirstRun=[]; //character count before first run (for each program)
                let charCount=[]; //character count at the end (for each program)
                for(const file of replayerFiles){
                    let count = file.codeViewText.reduce(reducerStringArray,0)
                    if(count!=0 && file.hasRun){
                        charCount.push(count);
                        charCountAtFirstRun.push(file["charCountAtFirstRun"])
                        let timeDiff = new Date(file["timeAtStartProgramRun"] - file["timeAtStartProgramOpen"]);
                        timeDiffTillFirstRun.push(getDateTimeDiff(file["timeAtStartProgramOpen"], file["timeAtStartProgramRun"]));
                    }
                }
                csvValues[index]["time solving till first run (for each program)"]=timeDiffTillFirstRun.join(";");
                csvValues[index]["character count before first run (for each program)"]=charCountAtFirstRun.join(";");
                csvValues[index]["character count at the end (for each program)"]=charCount.join(";");
                delete csvValues[index]["entryId"];
                filesParsed++;
                if(filesParsed==csvValues.length){
                    filesParsed=0;
                    downloadCsv();
                }
            }
        }else if(type=="similarityAnalysis"){
            if (['TextInsert'].includes(jsonLog[i].sequence) && jsonLog[i].text_widget_class.includes('CodeViewText')){
                let activeIndex=getActiveIndex(replayerFiles);
                if(i!=0 && jsonLog[i-1].sequence.includes('Paste')){
                    replayerFiles[activeIndex].pastedTextLength+=jsonLog[i].text.length;
                }else{
                    replayerFiles[activeIndex].manualTextEditLength+=jsonLog[i].text.length;
                }
            }
            if(jsonLog[i].sequence.includes('Paste') &&
                jsonLog[i].text_widget_class!=null &&
                jsonLog[i].text_widget_class.includes("CodeViewText")){
                if(jsonLog[i+1].text!=null){
                    pastedTexts.push({'time': jsonLog[i+1].time, 'text': jsonLog[i+1].text});
                }
            }
        }
    }
    if(type=="replayer"){
        $('.event-list-row').focus(handleEventListFocus);
        modalJsonLog=jsonLog;
        $('#event-list-row-0').focus();
    }else if(type=="textGraph"){
        $("#modal-main-header-graph").empty();
        let file=`<div class="file active btn btn-outline-dark" onclick="handleTextGraphDataChange(this);" data-text_widget_id="AllFiles">All program files</div>`;
        $("#modal-main-header-graph").append(file);
        file=`<div class="file btn btn-outline-dark" onclick="handleTextGraphDataChange(this);" data-text_widget_id="ShellText">Shell</div>`;
        $("#modal-main-header-graph").append(file);
        for(var i=0;i<replayerFiles.length;i++){
            file=`<div class="file btn btn-outline-dark" onclick="handleTextGraphDataChange(this);" data-text_widget_id="${replayerFiles[i].text_widget_id}">${sanitizeName(replayerFiles[i].filename)}</div>`;
            $("#modal-main-header-graph").append(file);
        }
        chart = getNewChart('AllFiles');
    }else if(type=="similarityAnalysis"){
        replayerFiles = replayerFiles.map(i => ({...i, 'codeViewTextString' : i.codeViewText.join('\n')}));
        similarityDataAllFiles[entryId]={'jsonLog': jsonLog
                                , 'entryId': entryId
                                , 'fileName': deepCopy(files[entryId].fileName)
                                , 'folderName': files[entryId].folderName!=null ? deepCopy(files[entryId].folderName) : null
                                , 'pastedTexts': pastedTexts
                                , "replayerFiles": replayerFiles
                                , "file": deepCopy(files[entryId])};
        filesParsed++;
        if(filesParsed==csvValues.length){
            filesParsed=0;
            similarityAnalysis();
        }
    }
}

function deepCopy(obj) {
    return JSON.parse(JSON.stringify(obj));
}


function handleTextGraphDataChange(value){
    $('.file').removeClass('active');
    $(value).addClass('active');
    chart.destroy();
    chart = getNewChart($(value)[0].attributes['data-text_widget_id'].value);
}


function getNewChart(index){
    return new Chart( 'text-length-graph', {
        // The type of chart we want to create  
        type: 'line',
        // The data for our dataset
        data: {
            datasets: [{
              label: 'Character count',
              data:textGraphDataLog[index],
              borderColor: 'rgba(0, 98, 168, 1)',
              backgroundColor: 'rgba(0, 98, 168, 0.1)',
              fill: true,
              pointRadius:0
            }]
          }
        ,
        // Configuration options go here
        options: {
            maintainAspectRatio:false,
            interaction: {
                intersect:false,
                axis: 'x'
              },
            plugins:{
                title: {
                    display: true,
                    text: 'Text length graph',
                    font: {
                        size: 20
                    }
                },
                legend:{
                    display:false
                }
            },
            scales: {
                 y: {
                    min:0,
                    title: {
                        display: true,
                        text: 'Character count',
                        font: {
                            size: 14,
                            style:'bold'
                        }
                    }
                }, 
                x: {
                    type: 'timeseries',
                    display: true,
                    title: {
                        display: true,
                        text: 'Time',
                        font: {
                            size: 14,
                            style:'bold'
                        }
                    },
                    time: {
                        unit: 'minute',
                        displayFormats: {
                            minute: 'dd/MM HH:mm'
                        },
                        tooltipFormat: 'dd/MM/yyyy HH:mm:ss'
                    } ,    
                    ticks: {
                        source:'data',
                        maxTicksLimit:10,
                    } 
                }
            }
        }
    });
}


/** Edits replayerFiles, shellText based on logevent.
 * 
 * @param {Array} replayerFiles - contains array objects of opened files and their contents
 * @param {String array} shellText - content of shell
 * @param {*} logEvent - current jsonlog event object
 * @returns edited replayerFiles, shellText
 */
function addLogEvent(replayerFiles, shellText, jsonLog, index){
    let logEvent = jsonLog[index];
    let activeIndex=getActiveIndex(replayerFiles);
    if (['BuildStart','BuildEnd','RunStart','RunEnd','ErrorNormalized'].includes(logEvent.sequence)){
        return [replayerFiles, shellText];
    }
    let indexOfFile=-2;
    if (logEvent.text_widget_class!='ShellText' && logEvent.sequence !== 'ShellCommand'){
        indexOfFile=replayerFiles.findIndex(obj => obj.text_widget_id==logEvent.text_widget_id);
    }
    if (['Open','fileCreated'].includes(logEvent.sequence) || indexOfFile==-1) {

        if(activeIndex!=-1){
            replayerFiles[activeIndex].active=false;
        }

        let filename = logEvent.filename;
        if (!['Open','fileCreated'].includes(logEvent.sequence)) {
            filename="<untitled>";
        }
        if(logEvent.sequence=='Open' && logEvent.filename.includes('\\')){
            let filenameList=logEvent.filename.split('\\');
            filename=filenameList[filenameList.length-1];
        }

        if(indexOfFile>=0){
            replayerFiles[indexOfFile].active=true;
            replayerFiles[indexOfFile].filename=filename;
        }else{
            replayerFiles.push({"active":true
                , "text_widget_id":logEvent.text_widget_id
                , "filename":filename
                , "codeViewText":[]
                , "hasRun": false
                , "charCountAtFirstRun":0
                , "timeAtStartProgramOpen" : new Date(logEvent.time)
                , "timeAtStartProgramRun" : null
                , "pastedTextLength":0
                , "manualTextEditLength":0});
        }
    }else if (logEvent.sequence=='fileDeleted'){
        if(activeIndex!=-1){
            replayerFiles.splice(activeIndex, 1)
        }
    }else if (['TextInsert','TextDelete','FileContent'].includes(logEvent.sequence)){
        if(logEvent.text_widget_class.includes('CodeViewText')){
            if(activeIndex!=indexOfFile){
                if(activeIndex>=0){
                    replayerFiles[activeIndex].active=false;
                }
                replayerFiles[indexOfFile].active=true;
                activeIndex = indexOfFile;
            }
            if(jsonLog[index-1].sequence=='Open'){
                replayerFiles[activeIndex].codeViewText=addChangesToText([],logEvent);
            }else{
                if(activeIndex!=-1){
                    replayerFiles[activeIndex].codeViewText=addChangesToText(replayerFiles[activeIndex].codeViewText,logEvent);
                }else{
                    console.log("Error replayer no active files.\n"+replayerFiles);
                }
            }
        }else if(logEvent.text_widget_class=='ShellText'){
            shellText=addChangesToText(shellText,logEvent);
        }
    }else if(logEvent.sequence.includes('Button-1')
        && logEvent.text_widget_class === 'CodeViewText'){ //switch files
        for(let i=0; i<replayerFiles.length;i++){
            if(replayerFiles[i].text_widget_id==logEvent.text_widget_id){
                if(activeIndex!=-1){
                    replayerFiles[activeIndex].active=false;
                }
                replayerFiles[i].active=true;
                break;    
            }
        }
    }else if (logEvent.sequence === 'ShellCommand'
        && logEvent.command_text.slice(0, 4) === '%Run'
        && activeIndex !== -1
        && !replayerFiles[activeIndex]["hasRun"]) {
        replayerFiles[activeIndex]["hasRun"] = true;
        replayerFiles[activeIndex]["timeAtStartProgramRun"] = new Date(logEvent.time);
        replayerFiles[activeIndex]["charCountAtFirstRun"] = replayerFiles[activeIndex].codeViewText.reduce(reducerStringArray, 0);
    }
    return [replayerFiles, shellText];
}


/**
 * 
 * @param {*} objectList list of objects containing an active property.
 * @returns objectlist index of object with active property set to true.
 */
function getActiveIndex( objectList){
    for(let i=0; i<objectList.length;i++){
        if(objectList[i].active){
            return i;
        }
    }
    return -1;
}

/**
 *
 * @param {*} objectList list of objects containing an active property.
 * @returns objectlist index of object with propertyName property having same value as propertyValue
 */
function getIndexOfArrayObjectAcctoProperty( objectList, propertyName, propertyValue){
    for(let i=0; i<objectList.length;i++){
        if(objectList[i][propertyName]==propertyValue){
            return i;
        }
    }
    return -1;
}


/**
 * 
 * @param {String array} ideText - text added or removed based on logEvent
 * @param {*} logEvent - current jsonlog event object
 * @returns edited ideText
 */
function addChangesToText(ideText, logEvent){

    if(['TextInsert','FileContent'].includes(logEvent.sequence)){
        var textEntered=logEvent.text.split("\n");
        var index=logEvent.index.split(".");
        var indexRow=index[0]-1;
        var indexColumn=index[1];

        if (indexRow>=ideText.length){ //text added to end
            if (indexRow > ideText.length + 1) { //add padding if previous context missing
                ideText.push(...Array(indexRow - ideText.length).fill(""));
            }
            ideText=ideText.concat(textEntered);
        }else if(textEntered.length==1){
            var row=ideText[indexRow];
            ideText[indexRow]=row.slice(0,indexColumn)+textEntered[0]+row.slice(indexColumn,row.length);
        }else{
            var firstRow=ideText[indexRow];
            textEntered[textEntered.length-1]=textEntered[textEntered.length-1]+firstRow.slice(indexColumn,firstRow.length);
            ideText[indexRow]=firstRow.slice(0,indexColumn)+textEntered[0];
            ideText.splice(indexRow+1,0, ...textEntered.slice(1,textEntered.length));

        }
    }else if(logEvent.sequence=='TextDelete'){
        var index1=logEvent.index1.split(".");
        var index1Row=parseInt(index1[0]-1);
        var index1Column=parseInt(index1[1]);

        var index2=logEvent.index2;
        var row=ideText[index1Row];
        
        if(row!=null){
            if(index2=="None"){
                if(index1Column<row.length){
                    ideText[index1Row]=row.slice(0,index1Column)+row.slice(index1Column+1,row.length);
                }else{
                    ideText[index1Row]=row+ideText[index1Row+1];
                    ideText.splice(index1Row+1,1);
                }
            }else{
                index2=index2.split(".");
                var index2Row=parseInt(index2[0]-1);
                var index2Column=parseInt(index2[1]);

                if(index1Row==index2Row){
                    ideText[index1Row]=row.slice(0,index1Column)+row.slice(index2Column,row.length);
                }else{
                    var lastRow=ideText[index2Row];

                    if(lastRow!=null){
                        ideText[index1Row]=row.slice(0,index1Column)+lastRow.slice(index2Column,lastRow.length);
                        ideText.splice(index1Row+1,index2Row-index1Row);
                    }
                }
            }
        }
    }
    return ideText;
}

/** When event list row clicked in replayer, the event state is displayed in replayer
 * 
 */
function handleEventListFocus(value){
    var fileSwitch=$(value).hasClass('file');

    var jsonLogIndex=0
    if(fileSwitch){
        jsonLogIndex=$('.event-list-row.active')[0].attributes['data-logfile-object-index'].value;
    }else{
        jsonLogIndex=$(this)[0].attributes['data-logfile-object-index'].value;
        var eventListId=$(this)[0].attributes['id'].value;
        $(".event-list-row.active").removeClass('active');
        $("#"+eventListId).addClass('active');
    }

    var nearestCacheIndex=jsonLogIndex-(jsonLogIndex%logCacheInterval);

    var replayerFiles=deepCopy(modalJsonLog[nearestCacheIndex].analysation_cache.replayerFiles);
    var shellText=deepCopy(modalJsonLog[nearestCacheIndex].analysation_cache.shellText);
    
    var ideIndex=0;
    for(var i=nearestCacheIndex+1;i<=jsonLogIndex;i++){
        [replayerFiles, shellText]=addLogEvent(replayerFiles, shellText, modalJsonLog, i);

         if(modalJsonLog[jsonLogIndex].text_widget_class!=null
             && modalJsonLog[jsonLogIndex].text_widget_class.includes('CodeViewText')){
            if(modalJsonLog[jsonLogIndex].sequence=="TextInsert"){
                ideIndex=modalJsonLog[jsonLogIndex].index;
            }else if(modalJsonLog[jsonLogIndex].sequence=="TextDelete"){
                ideIndex=modalJsonLog[jsonLogIndex].index1;
            }
        }
    }
    
    var activeIndex=getActiveIndex(replayerFiles);
    if(fileSwitch){
        let text_widget_id = $(value)[0].attributes['data-text_widget_id'].value;
        replayerFiles.map((obj, index) => {
            if(obj.text_widget_id==text_widget_id){
                activeIndex=index;
                obj.active=true;
            }else{
                obj.active=false;
            }
          })
    }
    if(replayerFiles[activeIndex]!=null){
        var programText=replayerFiles[activeIndex].codeViewText.join("\n");
        $("#modal-program-text").text(programText);
    }

    if(shellText!=null){
        $("#modal-shell-text").text(shellText.join("\n"));
    }

    $("#modal-main-header-replayer").empty()
    for(var i=0;i<replayerFiles.length;i++){
        var file=`<div class="file btn btn-outline-dark ${replayerFiles[i].active ? 'active' : ''}" onclick="handleEventListFocus(this);" data-text_widget_id="${replayerFiles[i].text_widget_id}">${sanitizeName(replayerFiles[i].filename)}</div>`;
        $("#modal-main-header-replayer").append(file);
    }

    $('#modal-main-shell').scrollTop( $('#modal-main-shell')[0].scrollHeight); //scroll to bottom of shell

    hljs.highlightAll(); //colour the code in replayer

    //scroll replayer if text insert
    if(replayerFiles[activeIndex]!=null && ideIndex!=0){
        let ideIndexRow=ideIndex.split('.')[0];
        if(ideIndexRow>5){ideIndexRow-=5}
        let scrollHeight=$('#modal-main-ide')[0].scrollHeight/replayerFiles[activeIndex].codeViewText.length*ideIndexRow;
        $('#modal-main-ide').scrollTop(scrollHeight);
    }

}


function updateReplayerSpeed(val) {
    $('#replayer-speed').text(val); 
  }

function expandModal(val) {
    switch ($(val)[0].id) {
        case 'replayer-expand-btn':
            $('#replayerModal').toggleClass('modal-sb-space');
            break;
        case 'graph-expand-btn':
            $('#textGraphModal').toggleClass('modal-sb-space');
            break;
        case 'similarity-expand-btn':
            $('#similarity-analysis-modal').toggleClass('modal-sb-space');
            break;
    }
  }

async function replayerAutoPlay(){
    $('.btn-replayer-controls').toggleClass('d-none');
    await sleep(0);
    var btn=$(this)[0].id;
    if(btn=='replayer-pause'){
        return;
    }
    var speed=parseInt($('#replayer-speed-range').val());
    var jsonLogIndex=parseInt($('.event-list-row.active')[0].attributes['data-logfile-object-index'].value);

    for(var jsonLogIndex;jsonLogIndex<=modalJsonLog.length;jsonLogIndex+=speed){
        if($('.btn-replayer-controls.d-none')[0].id=='replayer-pause'){
            break;
        }
        speed=parseInt($('#replayer-speed-range').val());
        await sleep(120);
        $('#event-list-row-'+jsonLogIndex).focus();
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

function resetReplayerPlayBtn(){
    if($('#replayer-play').hasClass('d-none')){
        $('.btn-replayer-controls').toggleClass('d-none');
    }
}

/** Starts similarity analysis. Passing Files for analysis.
 *
 */
function getSimilarityAnalysisData(){
    resetSimilarityAnalysisResultsDOM();
    $('#compare-button').prop('disabled', true);
    $('#compare-button span').removeClass('d-none');
    similarityAnalysisResults={};
    let filesArr=Object.values(files);
    let duplicateFiles=[];
    similarityAnalysisResults['duplicateFiles']={}
    for (let file in files ){
        //Checking for duplicate files using file checksum
        duplicateFiles = filesArr.filter(i=>i.file?._data?.crc32 !=null && i.file._data.crc32==files[file].file._data.crc32
                                                                && (i.folderName==null || i.folderName!=files[file].folderName));
        if(duplicateFiles.length>=1 && !(similarityAnalysisResults['duplicateFiles'].hasOwnProperty(files[file].file._data.crc32))){
            duplicateFiles.push(files[file]);
            similarityAnalysisResults['duplicateFiles'][files[file].file._data.crc32]=duplicateFiles;
        }
        //analysing file contents
        readObject(files[file].file, file, "similarityAnalysis", '', files[file].type=="zip");
    }
    similarityAnalysisResults['duplicateFilesEntries']=Object.entries(similarityAnalysisResults['duplicateFiles']);
}

/**
 *
 * @param sourceCodeData
 * @param index - current index of sourceCodeData
 * @returns {Subarray of sourceCodeData}
 */
function getNearestSourceCodes( sourceCodeData, index){
    const scale = Math.min(Math.floor(10000/sourceCodeData.length),5);
    return sourceCodeData.slice(Math.max(index - scale - Math.max(scale - (sourceCodeData.length - index - 1),0), 0)
                                , Math.min(index + scale + Math.max(scale-index,0), sourceCodeData.length))
}

/** Performs source code comparison on program files.
 *
 * @param similarityDataArray
 */
function sourceCodeComparison(similarityDataArray) {
    //await new Promise(resolve => setTimeout(resolve));
    const sourceCodeDataReduced = similarityDataArray.reduce((acc, log) => {
        log.replayerFiles.filter(file => file.codeViewTextString.length > sourceCodeMinLength && file.filename!='<untitled>')
            .forEach(file => {
                acc.push({
                    'entryId': log.entryId, 'fileName': log.fileName, 'text_widget_id': file.text_widget_id
                    , 'folderName': log.folderName, 'programFile': file.filename, 'text': file.codeViewTextString
                })
            });
        return acc;
    }, []).sort((a, b) => a.text.length - b.text.length);


    const sourceCodeComparison = sourceCodeDataReduced.reduce((acc, log1, index1) => {
        let key = '';
        let fileKey = '';
        let comparison = 0;
        getNearestSourceCodes(sourceCodeDataReduced, index1).forEach((log2) => {
            if (log1.entryId !== log2 && (log1.folderName == null || log1.folderName != log2.folderName)) {
                comparison = stringSimilarity.compareTwoStrings(log1.text, log2.text);
                if (comparison > sourceCodeSimilarityPercent/100) {
                    if(log1.text.slice(0,13) != 'def foo(bar):'){ //ignore thonny template code
                        key = log1.folderName == null ? log1.entryId : log1.folderName;
                        fileKey = log1.entryId+'_'+log1.text_widget_id;
                        if (acc.hasOwnProperty(key)) {
                            if(acc[key].hasOwnProperty(fileKey)){
                                acc[key][fileKey]['similarObjects'].push({...log2, similarity: comparison});
                            }else{
                                acc[key][fileKey] = {'thisObject': log1, 'similarObjects': [{...log2, similarity: comparison}]};
                            }

                        } else {
                            acc[key] = {};
                            acc[key][fileKey] = {'thisObject': log1, 'similarObjects': [{...log2, similarity: comparison}]};
                        }
                    }
                }
            }
        });
        return acc;
    }, {});

    similarityAnalysisResults['sourceCodeComparison'] = Object.entries(sourceCodeComparison);
}

/** Similarity analysis is performed on analysed files.
 *
 */
function similarityAnalysis(){
    let similarityDataArray = Object.values(similarityDataAllFiles);

    //Pasted texts vs work %
    similarityAnalysisResults['pastedTextsPercentage'] =
        Object.entries(
            similarityDataArray.reduce((acc, log) => {
            log.replayerFiles.filter(file => file.pastedTextLength > pastedTextMinLength
                && file.filename!='<untitled>'
                && file.pastedTextLength/(file.pastedTextLength+file.manualTextEditLength)>pastedTextPercent/100)
                .forEach(file => {
                    key = log.folderName == null ? log.entryId : log.folderName;
                    fileKey = log.entryId+'_'+file.text_widget_id;
                    if (!(acc.hasOwnProperty(key))) {
                        acc[key] = {};
                    }
                    acc[key][fileKey] = {
                        'entryId': log.entryId, 'fileName': log.fileName, 'text_widget_id': file.text_widget_id
                        , 'folderName': log.folderName, 'programFile': file.filename, 'text': file.codeViewTextString
                        , 'pastedTextLength': file.pastedTextLength, 'manualTextEditLength': file.manualTextEditLength
                    };
                });
            return acc;
            }, {})
        );

    //get pasted text grouped by text length
    const pastedTextsGrouped = similarityDataArray.reduce((acc, log) => {
        let textLengthKey = '';
        let pastedTextValue={};
        log.pastedTexts.filter(pastedText => pastedText.text.length>pastedTextMinLength) //no copied texts with less than 50 chars
            .forEach(pastedText => {
                textLengthKey = pastedText.text.length.toString();
                pastedTextValue={'entryId': log.entryId, 'fileName': log.fileName, 'folderName': log.folderName};
                if(!(acc.hasOwnProperty(textLengthKey))){
                    acc[textLengthKey]= {};
                    acc[textLengthKey][pastedText.text]=[pastedTextValue];
                }else{
                    if(!(acc[textLengthKey].hasOwnProperty(pastedText.text))){
                        acc[textLengthKey][pastedText.text]=[pastedTextValue];
                    }else if(!(acc[textLengthKey][pastedText.text].find(i => i.entryId==log.entryId ||                                //no identical copies from same file
                                                                            (i.folderName!=null && i.folderName==log.folderName)))    //no identical copies from same student
                    ){
                        acc[textLengthKey][pastedText.text].push(pastedTextValue);
                    }
                }
            });
        return acc;
    }, {});

    //pasted texts analysis
    similarityAnalysisResults['pastedTexts'] =
        Object.values(pastedTextsGrouped).map( value =>
                Object.entries(value).filter(([innerKey, innerValue]) => innerValue.length > 1) //remove pasted texts which didn't have matches
        ).filter(value => value.length > 0) //remove pasted text length which didn't have matches
            .flat(1); //flatten array

    //source code x pasted texts grouped by text length
    const sourceCodePastedGrouped = similarityDataArray.reduce((acc, log) => {
        let textLengthKey = '';
        log.replayerFiles.filter(file => file.codeViewTextString.length>pastedTextMinLength)
            .forEach(file => {
                textLengthKey = file.codeViewTextString.length.toString();
                if(acc.hasOwnProperty(textLengthKey)){
                    if(acc[textLengthKey].hasOwnProperty(file.codeViewTextString)){
                        if(acc[textLengthKey][file.codeViewTextString].find(i => i.entryId!=log.entryId &&                                //no identical copies from same file
                                                                                 (i.folderName==null || i.folderName!=log.folderName))    //no identical copies from same student
                        ){
                            acc[textLengthKey][file.codeViewTextString].push({'entryId': log.entryId, 'fileName': log.fileName
                                , 'folderName': log.folderName, 'programFile': file.filename});
                        }
                    }
                }
            });
        return acc;
    },pastedTextsGrouped);

    //sourceCodePasted analysis
    similarityAnalysisResults['sourceCodePasted'] =
        Object.values(sourceCodePastedGrouped).map( value =>
            Object.entries(value)
                .filter(([innerKey, innerValue]) => innerValue.find(i => i.hasOwnProperty('programFile')))
                .filter(([innerKey, innerValue]) => innerValue.length > 1) //remove pasted texts which didn't have matches
        ).filter(value => value.length > 0) //remove pasted text length which didn't have matches
            .flat(1); //flatten array

    //source code comparison
    sourceCodeComparison(similarityDataArray);

    if(similarityDataArray[0].folderName!=null){
        //group students
        const studentWorkGrouped = similarityDataArray.reduce((acc, log) => {
            if(acc.hasOwnProperty(log.folderName)){
                acc[log.folderName][0].value += log.file.fileAnalysisResults["run count"] + log.file.fileAnalysisResults["debug count"];
                acc[log.folderName][1].value += getDateDiffInMinutes(new Date(log.jsonLog[0].time),new Date(log.jsonLog[log.jsonLog.length-1].time));
                acc[log.folderName][2].value += log.file.fileSize;
            }else{
                acc[log.folderName]=[{"problem":"Total run count is ", "value": log.file.fileAnalysisResults["run count"] + log.file.fileAnalysisResults["debug count"], "unit":""}
                    , {"problem":"Total time spent working is ", "value": getDateDiffInMinutes(new Date(log.jsonLog[0].time),new Date(log.jsonLog[log.jsonLog.length-1].time)), "unit":"minutes"}
                    , {"problem":"Incomplete logfiles submitted, total of", "value": log.file.fileSize, "unit":"KB"}];
            }
                return acc;
            }, {});

        //student based analysis
        similarityAnalysisResults['studentsWorkData'] = Object.entries(studentWorkGrouped).reduce((acc, log) => {
            if(log[1][2].value>=workAnalysisSize){
                log[1].splice(2,1);
            }
            if(log[1][1].value>=workAnalysisTimeSpentMinutes){
                log[1].splice(1,1);
            }

            if(log[1][0].value>workAnalysisRunCount){
                log[1].splice(0,1);
            }
            if(log[1].length>0){
                acc.push(log);
            }
            return acc;
        }, []);
    }

    $('#similarity-analysis-modal').modal('show');
    displaySimilarityAnalysisResults();
}

/** resets similarity analysis results DOM and enables compare button
 *
 */
function similarityOnHide(){
    resetSimilarityAnalysisResultsDOM();
    $('#compare-button').prop('disabled', false);
    $('#compare-button span').addClass('d-none');
}

/** resets similarity analysis results DOM
 *
 */
function resetSimilarityAnalysisResultsDOM(){
    let modalTabs = [['duplicate-files-tab', 'duplicate-files-pane'], ['pasted-texts-tab', 'pasted-texts-pane']
        , ['student-work-tab', 'student-work-pane'], ['source-code-pasted-tab', 'source-code-pasted-pane']
        ,['source-code-comparison-tab', 'source-code-comparison-pane'], ['pasted-texts-percentage-tab', 'pasted-texts-percentage-pane']];
    modalTabs.forEach(tabArr =>{
        $(`#${tabArr[0]} span`).text(0).removeClass("badge-warning").addClass("badge-success");
        $(`#${tabArr[1]}`).addClass('d-none');
        $(`#${tabArr[1]} .list-group`).empty();
        $(`#${tabArr[1]} .tab-content`).empty();
    })
}

/**switches similarity list item
 *
 */
function switchSimilarityListItem(keyEvent) {
    if (keyEvent.code == "Tab") {
        $(this).tab('show');
    }
}

/** If text is longer than length, it will be cut and '...' will be added
 *
 * @param text
 * @param length
 * @returns {string|*}
 */
function getDisplayTextForDOM( text, length){
    return text.length > length ? text.substring(0,length)+'\n...\n...\n...' : text;
}

/**adds similarity analysis results DOM
 *
 * @param paneId
 * @param analysisType
 */
function addSimilarityAnalysisResultsDOM(paneId, analysisType) {
    let newTabListElement = ``;
    let newTabPanelElement = ``;
    let metricId = '';
    let metricValues = [];
    let tabPanelValue = ``;
    for (let i = 0; i < similarityAnalysisResults[analysisType].length; i++) {
        metricId = similarityAnalysisResults[analysisType][i][0];
        metricValues = similarityAnalysisResults[analysisType][i][1];
        if(['sourceCodeComparison', 'pastedTextsPercentage'].includes(analysisType)){
            metricValues = Object.values(similarityAnalysisResults[analysisType][i][1]);
            tabPanelValue = ``;
        }else{
            tabPanelValue = `<div class="card"><div class="card-body"><pre><code class="python hljs">${getDisplayTextForDOM(metricId, 1000)}</code></pre></div></div>`;
        }


        for (let j = 0; j < metricValues.length; j++) {
            if(analysisType=='studentsWorkData'){
                tabPanelValue += `<p><b><h6>${j}.</h6></b> ${metricValues[j].problem} <b> ${metricValues[j].value.toString() +' '+ metricValues[j].unit} </b></p>`;
            }else if(analysisType=='pastedTextsPercentage'){
                tabPanelValue += `
                    <div class="row">
                      <div class="col-12">
                        <div class="card">
                            <div class="card-header">
                            <b>${j}.</b>
                            <br><b>Pasted text length: ${metricValues[j].pastedTextLength}</b>
                            <br><b>Typed text length: ${metricValues[j].manualTextEditLength}</b>
                            <p><b>Filename:</b> ${metricValues[j].fileName +
                (metricValues[j].folderName==null ? '' : '; <br><b>Foldername:</b> '+metricValues[j].folderName)}
                                <br><b>Source code file:</b> ${sanitizeName(metricValues[j].programFile)}</p>
                            </div>
                            <div class="card-body"><pre><code class="python hljs">${getDisplayTextForDOM(metricValues[j].text,1000)}</code></pre></div>
                        </div>                
                      </div>
                    </div>
                    <hr>
                    `;
            }else if(analysisType=='sourceCodeComparison'){
                metricValues[j].similarObjects.forEach( (programFile, index) => {
                    tabPanelValue += `
                        <div class="row">
                          <div class="col-12 text-center">
                            <b>${j}.${index} Similarity ${programFile.similarity*100}%</b>
                            <br><b>Character length: ${programFile.text.length}</b>
                          </div>
                          <div class="col-md-6">
                            <div class="card">
                                <div class="card-header">
                                <p><b>Filename:</b> ${metricValues[j].thisObject.fileName +
                            (metricValues[j].thisObject.folderName==null ? '' : '; <br><b>Foldername:</b> '+metricValues[j].thisObject.folderName)}
                                    <br><b>Source code file:</b> ${sanitizeName(metricValues[j].thisObject.programFile)}</p>
                                </div>
                                <div class="card-body"><pre><code class="python hljs">${getDisplayTextForDOM(metricValues[j].thisObject.text,1000)}</code></pre></div>
                            </div>
                          </div>
                          <div class="col-md-6">
                            <div class="card">
                                <div class="card-header">
                                <p><b>Filename:</b> ${programFile.fileName +
                            (programFile.folderName==null ? '' : '; <br><b>Foldername:</b> '+programFile.folderName)}
                                    <br><b>Source code file:</b> ${sanitizeName(programFile.programFile)}</p>
                                </div>
                                <div class="card-body"><pre><code class="python hljs">${getDisplayTextForDOM(programFile.text,1000)}</code></pre></div>
                            </div>                
                          </div>
                        </div>
                        <hr>
                        `;
                });
            }else if(analysisType=='sourceCodePasted' && metricValues[j].hasOwnProperty('programFile')){
                tabPanelValue += `<p><b><h6>${j}.</h6> Filename:</b> ${metricValues[j].fileName + 
                (metricValues[j].folderName==null ? '' : '; <br><b>Foldername:</b> '+metricValues[j].folderName)}
                <br><b>Source code file:</b> ${sanitizeName(metricValues[j].programFile)}</p>`;
            }else{
                tabPanelValue += `<p><b><h6>${j}.</h6> Filename:</b> ${metricValues[j].fileName + (metricValues[j].folderName==null ? '' : '; <br><b>Foldername:</b> '+metricValues[j].folderName)}</p>`;
            }
        }
        if(['pastedTexts', 'sourceCodePasted'].includes(analysisType)){
            metricId = metricId.substring(0, 10)+'...';
        }
        let elementCounter = '';
        switch (analysisType) {
            case 'sourceCodeComparison':
                elementCounter = `<span class="badge badge-pill badge-primary ml-1">${metricValues.reduce((acc,val)=>{return acc+val.similarObjects.length},0)}</span>`;
                break;
            case 'pastedTextsPercentage':
                elementCounter = `<span class="badge badge-pill badge-primary ml-1">${metricValues.length}</span>`;
                break;
        }
        newTabListElement = `<a class="list-group-item list-group-item-action ${i == 0 ? 'active' : ''}" data-toggle="list" 
                                href="#similarity-${i.toString() + '-' + analysisType}" role="tab">${metricId} ${elementCounter}</a>`;
        newTabPanelElement = `<div class="tab-pane fade ${i == 0 ? 'active show' : ''}" id="similarity-${i.toString() + '-' + analysisType}" role="tabpanel">${tabPanelValue}<hr></div>`;
        $(`#${paneId} .list-group`).append(newTabListElement);
        $(`#${paneId} .tab-content`).append(newTabPanelElement);
    }
}

/** If any similarity analysis results are present, then display them in the DOM.
 *
 */
function displaySimilarityAnalysisResults(){
    if(Object.keys(similarityAnalysisResults).length==0){
        $('#similarity-summary-pane').addClass('show active');
        return;
    }
    if(similarityAnalysisResults['duplicateFilesEntries']?.length>0){
        $('#duplicate-files-tab span').text(similarityAnalysisResults['duplicateFilesEntries'].length).removeClass("badge-success").addClass("badge-warning");
        $('#duplicate-files-pane').removeClass('d-none');
        addSimilarityAnalysisResultsDOM('duplicate-files-pane', 'duplicateFilesEntries');
    }
    if(similarityAnalysisResults['pastedTexts']?.length>0){
        $('#pasted-texts-tab span').text(similarityAnalysisResults['pastedTexts'].length).removeClass("badge-success").addClass("badge-warning");
        $('#pasted-texts-pane').removeClass('d-none');
        addSimilarityAnalysisResultsDOM('pasted-texts-pane', 'pastedTexts');
    }
    if(similarityAnalysisResults['studentsWorkData']?.length>0){
        $('#student-work-tab span').text(similarityAnalysisResults['studentsWorkData'].length).removeClass("badge-success").addClass("badge-warning");
        $('#student-work-pane').removeClass('d-none');
        addSimilarityAnalysisResultsDOM('student-work-pane', 'studentsWorkData');
    }
    if(similarityAnalysisResults['sourceCodePasted']?.length>0){
        $('#source-code-pasted-tab span').text(similarityAnalysisResults['sourceCodePasted'].length).removeClass("badge-success").addClass("badge-warning");
        $('#source-code-pasted-pane').removeClass('d-none');
        addSimilarityAnalysisResultsDOM('source-code-pasted-pane', 'sourceCodePasted');
    }
    if(similarityAnalysisResults['sourceCodeComparison']?.length>0){
        $('#source-code-comparison-tab span').text(similarityAnalysisResults['sourceCodeComparison'].length).removeClass("badge-success").addClass("badge-warning");
        $('#source-code-comparison-pane').removeClass('d-none');
        addSimilarityAnalysisResultsDOM('source-code-comparison-pane', 'sourceCodeComparison');
    }
    if(similarityAnalysisResults['pastedTextsPercentage']?.length>0){
        $('#pasted-texts-percentage-tab span').text(similarityAnalysisResults['pastedTextsPercentage'].length).removeClass("badge-success").addClass("badge-warning");
        $('#pasted-texts-percentage-pane').removeClass('d-none');
        addSimilarityAnalysisResultsDOM('pasted-texts-percentage-pane', 'pastedTextsPercentage');
    }
    $(`#modal-main-header-similarity .nav-item:first`).click();
    $(`#similarity-analysis-modal .list-group-item`).keyup(switchSimilarityListItem);
    hljs.highlightAll();
}

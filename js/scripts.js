$(function() {
    console.log( "ready!" );
    $(".custom-file-input").on("change", function() {
        var fileName = $(this).val()//.split("\\").pop();
        $(this).siblings(".custom-file-label").addClass("selected").html(fileName);
      });

    addListeners();
});

function addListeners(){
    $(".input-group-append").click(fileSubmit);
}

function fileSubmit(){
    if(this.previousElementSibling.firstElementChild.value==''){
        alert("Enter text file!");
        return;
    }
    readTxtFile(this.previousElementSibling.firstElementChild.files[0]);
}

function readTxtFile(file){
    if(file.type==='text/plain'){
        const reader = new FileReader();
        reader.readAsText(file);
        reader.addEventListener('load', (event) => {
            const result = event.target.result;
            analyse(JSON.parse(result));
          });
    }else{
        alert("Enter text file!");
    }
}

function analyse(jsonLog){
    const startTime=new Date(jsonLog[0].time);
    const endTime=new Date(jsonLog[jsonLog.length-1].time);
    const elapsedDate=new Date(endTime-startTime);
    var elapsedTime=elapsedDate.toISOString().slice(11, -1);
    if(elapsedDate.getDate()>1){
        elapsedTime=(elapsedDate.getDate()-1).toString().concat(" days, ", elapsedTime)
    }

    var errorCount=0;
    var runCount=0;
    var copyPasteCount=0;
    for(var i=0;i<jsonLog.length;i++){
        if(jsonLog[i].sequence==='ShellCommand' && jsonLog[i].command_text.slice(0,4)==='%Run'){
            runCount++;
        }
        if(jsonLog[i].sequence==='TextInsert' && jsonLog[i].text.includes('Error')){
            errorCount++;
        }
        if(jsonLog[i].sequence==='<<Paste>>' && jsonLog[i].text_widget_class==="CodeViewText"){
            copyPasteCount++;
        }
    }
    
    var generalInfo={
        'startTime':startTime,
        'endTime':endTime,
        'elapsedTime':elapsedTime,
        'errorCount':errorCount,
        'runCount':runCount,
        'copyPasteCount':copyPasteCount
    }
    if($('#general-info-table-c').hasClass('d-none')){
        $('#general-info-table-c').removeClass('d-none');
    }
    displayDataTable('general-info-table-c',generalInfo);
}

function displayDataTable(tableContId,data){
    const tbody=$('#'+tableContId+" table tbody");
    tbody.empty();
    for(const key in data){
        tbody.append('<tr><td>'.concat(key,'</td><td>',data[key],'</td></tr>'));
    }
}

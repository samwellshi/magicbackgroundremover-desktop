
<script>
import removeBackground from '@imgly/background-removal';
import PickColors from 'vue-pick-colors'
//console.log(Sketch)
const { ipcRenderer } = require('electron');
const shell = require('electron').shell;
// const { app } = require("electron").remote
// const path = require ('path');

// let homeDir =  path.dirname(app.getPath('exe'))
// console.log(__dirname);
// console.log(process.env.MY_ENV);
const res_path = process.env.IS_DEV ? "" : (__dirname + "/../dist/");
// console.log(homeDir);
// ipcRenderer.on('active',(event, arg)=>{
//       //这里是主进程传过来的消息
//       console.log("from mainwindow:" + arg);
//     });    
// console.log(process.env.SHOW_BUY_COFFEE)
let showbuycoffee = process.env.SHOW_BUY_COFFEE == "yes"?true:false;
const API_SERVER = 'https://magicbackgroundremover.com/api/'

export default {
  // name: 'App',
  components: {
    'color-picker': PickColors,
  },
  data(){
      return {
        filelist:{},
        waitinglist:[],
        picker_color: '#ffffff',
        colors:['#ffaaa5','#ffd3b6','#dcedc1','#a8e6cf','#61c0bf','#bbded6','#fae3d9','#ffb6b9','#9ee9d3','#2fc6c8','#2d7a9d','#48466d','#5f2b63','#b23554','#f27e56','#fce766','#86dccd','#e7fdcb','#ffdc84','#f57677','#5fc2c7','#98dfe5','#c2eff3','#ddfdfd'],
        background_removed_file:null,
        filename:'',
        caption:"",
        running:false,
        hide_buy_cofee_panel:true,
        show_edit_image:true,
        img_naturalHeight:0,
        img_naturalWidth:0,
        bgcolor:'#fff',
        isrunning:false,
        bg_file:null,
        canvas_height:380,
        canvas_width:470,
        bg_photos:{},
        model_size:{
          'fetch:medium': 88188479,
          'fetch:ort-wasm-simd-threaded.wasm': 10281838,
          'fetch:ort-wasm-simd.wasm':10335238,
          'fetch:ort-wasm-threaded.wasm':9413659,
          'fetch:ort-wasm.wasm':9487920          
        }
      }
  },
  mounted () {
    setInterval(this.do_task, 500);
    this.check_update();
		let dropArea = document.getElementById('droparea');
  	    dropArea.addEventListener('drop', this.dropEvent, false);
        dropArea.addEventListener('dragleave', (e) => {
          e.stopPropagation()
          e.preventDefault()
          this.dropActive = false
        });
        dropArea.addEventListener('dragenter', (e) => {
	        e.stopPropagation()
	        e.preventDefault()
	        this.dropActive = true
  	    });
	      dropArea.addEventListener('dragover', (e) => {
	        e.stopPropagation()
	        e.preventDefault()
	        this.dropActive = true
	      });
    // this.dotask();
	},  
  methods:{
    post(url, data, cb){
      const httpReq = new XMLHttpRequest();
      httpReq.open("POST", url);
      httpReq.send(data);

      httpReq.onreadystatechange = (e) => {
        if(httpReq.readyState == 4 && httpReq.status == 200){
          var jsonstr = httpReq.responseText;
          var jsonobj = JSON.parse(jsonstr);
          cb(jsonobj);
        }
      }

    },
    check_update(){
      // const url='https://app.magicbackgroundremover.com/checkupdate';
      // console.log('checkupdate');
      const url = API_SERVER + 'checkupdate'
      var data = new FormData();
          data.append('appversion', process.env.OS_TYPE);
          data.append('ostype', process.env.APP_VERSION);
      this.post(url, data, function(res){
          // console.log(res.code);
      });
    },
    buy_me_coffee(){
      shell.openExternal("https://www.buymeacoffee.com/samwellshii");
    },
    toggleSelectBgPhoto(){
      document.getElementById("select_bg_photo_input").click();
    },
    sendSuccess(){
      const url=API_SERVER + '/bgremoved';
      var data = new FormData();
          data.append('clientid', process.env.CLIENT_ID);
          data.append('from', 'client_app');
          data.append('ostype', process.env.APP_VERSION);
      this.post(url, data, function(res){
          // console.log(res);
      });
    },
    dropEvent(e) {
	        this.dropActive = false
	        e.stopPropagation()
	        e.preventDefault()
	        this.filter_file(e.dataTransfer.files)
	  },
    async do_task(){
      if(this.waitinglist && this.waitinglist.length > 0){
        if(this.isrunning) return;
        this.isrunning = true;
        let f = this.waitinglist.shift();
        // for(var i = 0; i < files.length; i++){
          // while(this.running){}
          // let f = files[i];
          this.filelist[f.path]["status"] = "running";
          try {
            await this.remove_bg(f);            
            this.isrunning = false;
            // console.log(process.env.SHOW_BUY_COFFEE)
            if(showbuycoffee){
              showbuycoffee = false;
              this.hide_buy_cofee_panel = false;
              ipcRenderer.send('update_time', "");
            }
          } catch (error) {
            this.isrunning = false;
            this.filelist[f.path]["status"] = "error";
          }
        // }
      }
    },
    toggleSelectFile(){
      // console.log("000");
      let selectfileEl = document.getElementById('select_file_input');
      selectfileEl.click();
    },
    toggleSelectDir(){
      // console.log("000");
      document.getElementById('select_dir_input').click();
    },
    selectDirectory(e){
      // console.log(e);
      let files = e.target.files || [];
      this.filter_file(files);
    },
    add_waiting_file(f){
      var o = this;
      let fileName = f.name;
      var idxDot = fileName.lastIndexOf(".") + 1;
      var extFile = fileName.substr(idxDot, fileName.length).toLowerCase();
      if (extFile =="jpg" || extFile=="jpeg" || extFile=="png" || extFile=="pjpeg" || extFile=="pjp"|| extFile=="jfif"){
        var slash = fileName.lastIndexOf("_");
        var fileprefix = fileName.substr(slash, fileName.length).toLowerCase();
        if(fileprefix == "_bgremoved.png"){
          alert(fileName + " background is removed.");
          return;
        }
        var reader = new FileReader();
        reader.readAsDataURL(f);
        this.waitinglist.push(f);
        this.filelist[f['path']] = {file:f, status:"waiting"};
        reader.onload = function(e) {
            var newUrl = this.result;
            o.filelist[f['path']]['imgsrc'] = newUrl;
        };
      }else{
        alert("[" + fileName + "] not support format. only support png or jpg format image.")
      }

    },
    selectFile(e){
      let files = e.target.files;
      if (files && files.length) {
        var len = files.length;
        for(var i = 0; i < len; i++){
          if(!this.filelist[files[i]['path']]){
            this.add_waiting_file(files[i]);
          }else{
            alert(files[i].name + " is exists.")
          }
        }
      }
    },
    filter_file (files) {
	      // console.log(files[0], 'file')
          if (files && files.length) {
            var len = files.length;
            for(var i = 0; i < len; i++){
              var f = files[i];
              let fileName = f.name;
              // uploadFile(files[0]);
              var idxDot = fileName.lastIndexOf(".") + 1;
              var extFile = fileName.substr(idxDot, fileName.length).toLowerCase();
              if (extFile=="jpg" || extFile=="jpeg" || extFile=="png" || extFile=="pjpeg" || extFile=="pjp"|| extFile=="jfif"){
                if(!this.filelist[f['path']]){
                  this.add_waiting_file(f);
                }else{
                  alert(files[i].name + " is exists.")
                }
              }else{
                  // alert("Only jpg/jpeg, png, bmp, webp files are allowed!");
              }   
            }

          }
	  },
    reset(){
      this.bg_file = null;
      this.bgcolor = '';
      let canvas = document.getElementById("rmbgimg");
      var ctx = canvas.getContext('2d');
      var imgel = document.createElement("img");
      const imgurl = this.background_removed_file;//URL.createObjectURL(this.background_removed_file)
      imgel.src = imgurl;
      var imgW = this.canvas_width;
      var imgH = this.canvas_height;
      imgel.onload = function(){
        canvas.width = imgW;
        canvas.height = imgH;
        var bgimgel = document.createElement("img");
            bgimgel.src = res_path + "/img/transparent.svg";
            bgimgel.onload = function(){
              var pattern=ctx.createPattern(bgimgel, "repeat");
              ctx.fillStyle=pattern;
              ctx.fillRect(0,0, imgW, imgH);
              ctx.drawImage(imgel, 0, 0, imgW, imgH);
        }
      }
    },
    save(){
      let canvas = document.createElement('canvas');
      var ctx = canvas.getContext('2d');
      var imgel = document.createElement("img");
      const imgurl = this.background_removed_file;// URL.createObjectURL(this.background_removed_file)
      imgel.src = imgurl;
      const filename = this.filename;
      var imgW = this.img_naturalWidth;
      var imgH = this.img_naturalHeight;
      canvas.width = imgW;
      canvas.height = imgH;
      if(this.bgcolor != ''){
        var color = this.bgcolor;
        imgel.onload = function(){
          ctx.fillStyle = color;
          ctx.fillRect(0, 0, imgW, imgH);
          ctx.drawImage(imgel, 0, 0, imgW, imgH);
          doSave()
        }
      }else if(this.bg_file != null){
        var bgimgel = document.createElement("img");
        const bgimgurl = this.bg_file;//URL.createObjectURL(this.bg_file);
        bgimgel.src = bgimgurl;
        imgel.onload = function(){
          bgimgel.onload = function(){
            ctx.drawImage(bgimgel, 0, 0, imgW, imgH);
            ctx.drawImage(imgel, 0, 0, imgW, imgH);
            doSave()
          }
        }
      }else{
        imgel.onload = function(){
          ctx.drawImage(imgel, 0, 0, imgW, imgH);
          doSave()
        }
      }

      function doSave(){
        // document.body.append(canvas);
        // let canvas = document.getElementById("rmbgimg");
        let imgbase64 = canvas.toDataURL();
        const link = document.createElement("a");
        link.href = imgbase64;
        link.download = filename + `_rmbg.png`;
        link.click();
      }
    },
    on_color_card_click(color){
      this.bgcolor = color;
      this.update_bg_color();
    },
    calculate_width_height(imgW, imgH){
      var height = 380;
      var width = 470;
      if(imgH < height && imgW < width){
        this.canvas_height = imgH;
        this.canvas_width = imgW;
        return;
      }
      var rh = height / imgH;
      var rw = width / imgW;
      // var r = rh > rw ? rw : rh;
      // var r = height / imgH;
      // if(r * imgW > width){
      //   r = width / imgW;
      // }
      if((rh * imgW) > width){
        this.canvas_height = rw * imgH;
        this.canvas_width = rw * imgW;
      }else{
        this.canvas_height = rh * imgH;
        this.canvas_width = rh * imgW;
      }
      // height = rH * imgH;
      // width = rW * imgW;
    },
    edit_img(imgdataurl, status){
      // console.log(status);
        if(status != "done") return;
          this.show_edit_image = false;
          this.background_removed_file = imgdataurl;
          var owner = this;
          let canvas = document.getElementById("rmbgimg");
              // imgEl.src = URL.createObjectURL(this.original_file);
          var ctx = canvas.getContext('2d');
          var imgel = document.createElement("img");
              imgel.src = imgdataurl;
          imgel.onload = function(){
            var bgimgel = document.createElement("img");
                bgimgel.src = res_path + "/img/transparent.svg";
            //  ctx.fillRect(0,0,300,300);
                owner.calculate_width_height(imgel.width, imgel.height);
                canvas.width = owner.canvas_width;
                canvas.height = owner.canvas_height;
              // ctx.fillStyle = color;
                  // const link = document.createElement("a");
                  // link.href = url;
                  // link.download = `eraser_example.png`;
                  // link.click();
                bgimgel.onload = function(){
                  var pattern=  ctx.createPattern(bgimgel, "repeat");
                  ctx.fillStyle = pattern;
                  ctx.fillRect(0,0, owner.canvas_width, owner.canvas_height);
                  ctx.drawImage(imgel, 0, 0, owner.canvas_width, owner.canvas_height);
                  // console.log("finish....")
                  // owner.isrunning = false;
                }
            }
    },
    update_bg_color(){
      this.bg_file = null;
      let canvas = document.getElementById("rmbgimg");
      var ctx = canvas.getContext('2d');
      var imgel = document.createElement("img");
      const imgurl = this.background_removed_file;//URL.createObjectURL(this.background_removed_file)
      imgel.src = imgurl;
      var imgW = this.canvas_width;
      var imgH = this.canvas_height;
      var color = this.bgcolor;
      imgel.onload = function(){
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, imgW, imgH);
        ctx.drawImage(imgel, 0, 0, imgW, imgH);
      }
    },
    update_bg_photo(bg_file_url){
      this.bgcolor = '';
      this.bg_file = bg_file_url;//files[0];
      let bgimg_url = bg_file_url;//URL.createObjectURL(this.bg_file);
//      this.bg_photos[files[0]['path']] = bgimg_url;
      let canvas = document.getElementById("rmbgimg");
      var ctx = canvas.getContext('2d');
      var imgel = document.createElement("img");
      const imgurl = this.background_removed_file;
      imgel.src = imgurl;
      var imgW = this.canvas_width;
      var imgH = this.canvas_height;

      var bgimgel = document.createElement("img");
      const bgimgurl = bg_file_url;//URL.createObjectURL(this.bg_file);
      bgimgel.src = bgimgurl;
      imgel.onload = function(){
        bgimgel.onload = function(){
          // console.log("bgimg loaded");
          ctx.drawImage(bgimgel, 0, 0, imgW, imgH);
          ctx.drawImage(imgel, 0, 0, imgW, imgH);
        }
      }

    },
    selectBgPhoto(e){
      let files = e.target.files;
      if (files && files.length) {
        let bgimg_url = URL.createObjectURL(files[0]);
        this.update_bg_photo(bgimg_url);
        this.bg_photos[files[0]['path']] = bgimg_url;
      }
    },
    onImageLoaded(event, item) {
      const {naturalWidth, naturalHeight} = event.target;
      this.img_naturalWidth = naturalWidth;
      this.img_naturalHeight = naturalHeight;
      // console.log(naturalWidth)
      // console.log(naturalHeight)
      // set data coding
    },
    async remove_bg(file){
        var owner = this;
        const publicPath = new URL(import.meta.url);
        publicPath.pathname = res_path + '/js/';
        var starttime = Date.now() / 1000;
        await removeBackground(file, {
          publicPath: publicPath.href,
          fetchArgs:{
            cache:'force-cache',
            mode: 'no-cors'
          },
          progress: (key, current, total) => {
            const [type, subtype] = key.split(':');
            let str = "Downloading Model:"

            if(type == 'compute'){
              str = "Removing Background:"
            }
          }
        }).then(imageBlob =>{
          var finishtime = Date.now() / 1000;
          // console.log(finishtime - starttime);
          owner.sendSuccess();
          // console.log(map);
          owner.filelist[file.path]["status"] = "done";
          const url = URL.createObjectURL(imageBlob);
          owner.filelist[file.path]["imgsrc"] = url;
          const reader = new FileReader();
          reader.onload = function () {
            ipcRenderer.send('savefile', {filepath:file.path+"_bgremoved.png", blobdata:reader.result});
            // callback(reader.result);
          };
          reader.readAsDataURL(imageBlob);
        });
    }
  }
};
</script>

<style scoped>
.hidden{
  display:none;
}
.transparency-img {
  background-color: #fff;
  background-image: url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA3LjkzNyA3LjkzOCIgaGVpZ2h0PSIzMCIgd2lkdGg9IjMwIj48cGF0aCBwYWludC1vcmRlcj0ic3Ryb2tlIGZpbGwgbWFya2VycyIgZD0iTS4wMTQuMDE0SDMuOTdWMy45N0guMDE0ek0zLjk3IDMuOTY4aDMuOTU0djMuOTU1SDMuOTd6IiBmaWxsPSIjZWVlZmYwIi8+PC9zdmc+);
  background-size: 25px;
}

.color-list ul{
  padding:0;
  margin:0;
}
.color-list ul li{
  list-style:none;
  width:45px;
  height: 45px;
  display:inline-block;
  margin:3px;
  cursor: pointer;
  vertical-align:middle;
}
.color-list .sel-color{
  font-size:12px;
  background-color:#ccc;
  vertical-align:middle;

}
.select-color{
  font-size:0.01rem;
  background-color:#ccc;
  text-align:top;
}

</style>

<template>
    <div class="relative z-20" aria-labelledby="modal-title" role="dialog" aria-modal="true" :class="{hidden:hide_buy_cofee_panel}">
      <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
      <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <div class="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
            <div class="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
              <div class="sm:flex sm:items-start">
                <div class="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                  <h3 class="text-base font-semibold leading-6 text-gray-900" id="modal-title">Bue Me a Coffee</h3>
                  <div class="mt-2">
                    <img src="/img/buycoffee.png">
                  </div>
                </div>
              </div>
            </div>
            <div class="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
              <button type="button" class="inline-flex w-full justify-center rounded-md bg-orange-500 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-600 sm:ml-3 sm:w-auto"  @click="buy_me_coffee();hide_buy_cofee_panel=true;">Yes, I'd like to</button>
              <button type="button" class="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto" @click="hide_buy_cofee_panel=true;">No, Thanks</button>
            </div>
          </div>
        </div>
      </div>
    </div>

  <div id="droparea" class="">
    <div class="w-full bg-slate-200 m-px fixed z-10">
      <!-- <div class="text-center bg-orange-400 p-2 text-xl">
        If you like our work, please <a href="javascript:;" @click="buy_me_coffee()" class="text-emerald-800 underline">buy a coffee to support us!</a> Thanks!
      </div> -->
      <div>
        <button class="m-2 bg-cyan-500 p-2 text-white rounded-sm" @click="toggleSelectFile()">Select Images</button>     
        <button class="m-2 bg-cyan-500 p-2 text-white rounded-sm" @click="toggleSelectDir()">Select Directory</button>
        <i> (Or Drop Files ) Support png and jpg format image</i>
      </div>
    </div>
    <div class="w-full pt-28">
      <div class="float-left w-2/3 min-h-screen min-h-full h-screen pr-1 ">
        <div class="w-1/6 p-1 inline-block cursor-pointer" v-for="(v,k) in filelist" @click="edit_img(v.imgsrc, v.status)"  :title="v.file.name">
          <div class="relative">
            <img :src="v.imgsrc" class="border border-slate-300 transparency-img" :title="v.file.name" @load="onImageLoaded($event)" />
            <div class="absolute bottom-0 right-0 bg-cyan-400 rounded-sm text-xs p-1 text-white">{{v.status}}</div>
          </div>
          <p class="break-keep truncate text-center text-sm" :title="v.file.name">{{v.file.name}}</p>
        </div>
      </div>
      <div class="float-right w-1/3 border-l pl-1 " :class="{hidden:show_edit_image}">
        <div class="h-9 bg-slate-400 leading-9 relative">
          <h2 class="font-bold text-white ml-1.5 align-middle">Edit Image</h2>
          <div class="absolute right-2 top-1 text-sky-700 cursor-pointer text-xl" @click="show_edit_image=true;" title="Close">&#215;</div>
        </div>
        <div class="p-2">
          <button class="m-2 bg-cyan-500 px-2 text-white rounded-sm" @click="reset()">Reset</button>     
          <button class="m-2 bg-cyan-500 px-2 text-white rounded-sm" @click="save()">Save</button>
        </div>
        <div class="mx-auto h-96">
          <canvas id="rmbgimg" draggable=false></canvas>
        </div>
        <div class="color-list">
          <div class="h-9 bg-slate-400 leading-9">
            <h2 class="font-bold text-white ml-1.5 align-middle">Background Color</h2>
          </div>
            <ul>
              <li class="sel-color">
                Select <color-picker id="colorpicker" v-model:value="picker_color" @change="color_picker_change(color)" show-alpha > </color-picker> Color                    
              </li>
              <li v-for="color in colors" :style="{'background-color':color}" @click="on_color_card_click(color)"></li>
            </ul>
        </div>
        <div class="">
          <div class="h-9 bg-slate-400 leading-9">
            <h2 class="font-bold text-white ml-1.5 align-middle">Background Photo</h2>
          </div>
          <div class="bm-card mt-1"></div>
              <div class="photo-list">
                <ul class="p-0 m-0">
                  <li class="align-middle p-1 inline-block cursor-pointer w-16 h-20 border mr-1 text-center text-sm" @click="toggleSelectBgPhoto()"> Select Photo</li>
                  <li v-for="v,k in bg_photos" class="align-middle cursor-pointer p-0 border inline-block w-16 h-20 mr-1 text-center" @click="update_bg_photo(v)">
                    <img :src="v" :alt="k" class="max-h-20 text-center p-1" />                  
                  </li>
                </ul>
              </div>
        </div>
      </div>
    </div>
    <input type="file" id="select_file_input" @change="selectFile($event)" multiple="multiple" accept="image/*" class="invisible" />
    <input type="file" id="select_dir_input" @change="selectDirectory($event)" webkitdirectory directory multiple class="invisible" />
    <input type="file" id="select_bg_photo_input" @change="selectBgPhoto($event)" accept="image/*" class="invisible" />
  </div>
</template>
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Orchard.ContentManagement.Records;

namespace JWPlayer.Models {
    public class JWPlayerPartRecord : ContentPartRecord {

        public JWPlayerPartRecord()
        {
            this.PlayerSource = "~/Modules/JWPlayer/Flash/jwplayer.flash.swf";
            this.Width = 320;
            this.Height = 180;
            this.MediaFile = "https://www.youtube.com/watch?v=5ydj4BEnXfg";
        }
        public virtual string PlayerSource { get; set; }

        public virtual int Height { get; set; }

        public virtual int Width { get; set; }

        public virtual string MediaFile { get; set; }

        public virtual bool AutoStart { get; set; }

        public virtual bool Repeat { get; set; }
    }

}

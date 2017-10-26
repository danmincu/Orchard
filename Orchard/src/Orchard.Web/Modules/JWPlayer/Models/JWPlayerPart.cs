using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.ComponentModel.DataAnnotations;
using Orchard.ContentManagement;

namespace JWPlayer.Models {
    public class JWPlayerPart : ContentPart<JWPlayerPartRecord> {

        [Required]
        public string PlayerSource {
            get { return Record.PlayerSource; }
            set { Record.PlayerSource = value; }
        }

        [Required]
        public int Height {
            get { return Record.Height; }
            set { Record.Height = value; }
        }

        [Required]
        public int Width {
            get { return Record.Width; }
            set { Record.Width = value; }
        }

        [Required]
        public string MediaFile {
            get { return Record.MediaFile; }
            set { Record.MediaFile = value; }
        }

        public bool AutoStart {
            get { return Record.AutoStart; }
            set { Record.AutoStart = value; }
        }

        public bool Repeat {
            get { return Record.Repeat; }
            set { Record.Repeat = value; }
        }

    }

}

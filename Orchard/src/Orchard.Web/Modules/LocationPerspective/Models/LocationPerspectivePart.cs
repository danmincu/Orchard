using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.ComponentModel.DataAnnotations;
using Orchard.ContentManagement;

namespace LocationPerspective.Models {
    public class LocationPerspectivePart : ContentPart<LocationPerspectivePartRecord> {

        [Required]
        public string SourceDocuments {
            get { return Record.SourceDocuments; }
            set { Record.SourceDocuments = value; }
        }

        [Required]
        public string MapType
        {
            get { return Record.MapType; }
            set { Record.MapType = value; }
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
    }

}

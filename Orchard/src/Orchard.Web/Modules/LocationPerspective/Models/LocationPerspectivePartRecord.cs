using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Orchard.ContentManagement.Records;

namespace LocationPerspective.Models {
    public class LocationPerspectivePartRecord : ContentPartRecord {

        public virtual string SourceDocuments { get; set; }

        public virtual string MapType { get; set; }

        public virtual int Height { get; set; }

        public virtual int Width { get; set; }
        
    }

}

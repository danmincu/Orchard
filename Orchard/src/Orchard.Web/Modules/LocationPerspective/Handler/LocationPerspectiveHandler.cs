using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Orchard.Data;
using Orchard.ContentManagement.Handlers;
using LocationPerspective.Models;

namespace LocationPerspective.Handler {
    public class LocationPerspectiveHandler : ContentHandler {
        public LocationPerspectiveHandler(IRepository<LocationPerspectivePartRecord> repository) {
            Filters.Add(StorageFilter.For(repository));
        }        
    }

}

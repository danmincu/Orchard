using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using JWPlayer.Models;
using Orchard.Data;
using Orchard.ContentManagement.Handlers;

namespace JWPlayer.Handler {
    public class JWPlayerHandler : ContentHandler {
        public JWPlayerHandler(IRepository<JWPlayerPartRecord> repository) {
            Filters.Add(StorageFilter.For(repository));
        }        
    }

}

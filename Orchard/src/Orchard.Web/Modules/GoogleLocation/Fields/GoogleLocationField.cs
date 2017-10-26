using Orchard.ContentManagement;

namespace GoogleLocation.Fields
{
    public class GoogleLocationField : ContentField
    {

        public string PostalCode
        {
            get { return Storage.Get<string>("PostalCode"); }
            set { Storage.Set<string>("PostalCode", value); }
        }

        public string Category
        {
            get { return Storage.Get<string>("Category"); }
            set { Storage.Set<string>("Category", value); }
        }

        public string PlaceName
        {
            get { return Storage.Get<string>("PlaceName"); }
            set { Storage.Set<string>("PlaceName", value); }
        }

        public string PlaceLatLong
        {
            get { return Storage.Get<string>("PlaceLatLong"); }
            set { Storage.Set<string>("PlaceLatLong", value); }
        }
        
        public string LocationLatLong
        {
            get { return Storage.Get<string>("LocationLatLong"); }
            set { Storage.Set<string>("LocationLatLong", value); }
        }
    }

}

using Orchard.ContentManagement;

namespace LocationPickerField.Fields
{
    public class LocationPickerField : ContentField
    {
        public string PlaceName
        {
            get { return Storage.Get<string>("PlaceName"); }
            set { Storage.Set<string>("PlaceName", value); }
        }

        public string LocationLatLong
        {
            get { return Storage.Get<string>("LocationLatLong"); }
            set { Storage.Set<string>("LocationLatLong", value); }
        }
    }

}

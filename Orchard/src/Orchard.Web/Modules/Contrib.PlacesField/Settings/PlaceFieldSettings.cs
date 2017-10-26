namespace Contrib.PlacesField.Settings
{
    public enum PlacesFieldDisplayOptions
    {
        NameOnly,
        NameAndLinkToMap,
        NameAndEmbeddedMap
    }
    public class PlacesFieldSettings
    {
        public PlacesFieldDisplayOptions DisplayOptions { get; set; }
    }
}
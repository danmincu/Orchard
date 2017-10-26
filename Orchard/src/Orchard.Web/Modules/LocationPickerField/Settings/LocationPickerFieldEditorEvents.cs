using System.Collections.Generic;
using LocationPickerField.Settings;
using Orchard.ContentManagement;
using Orchard.ContentManagement.MetaData;
using Orchard.ContentManagement.MetaData.Builders;
using Orchard.ContentManagement.MetaData.Models;
using Orchard.ContentManagement.ViewModels;

public class LocationPickerFieldEditorEvents : ContentDefinitionEditorEventsBase
{

	public override IEnumerable<TemplateViewModel>
	  PartFieldEditor(ContentPartFieldDefinition definition)
	{
		if (definition.FieldDefinition.Name == "LocationPickerField")
		{
			var model = definition.Settings.GetModel<LocationPickerFieldSettings>();
			yield return DefinitionTemplate(model);
		}
	}

	public override IEnumerable<TemplateViewModel> PartFieldEditorUpdate(
	  ContentPartFieldDefinitionBuilder builder, IUpdateModel updateModel)
	{
		var model = new LocationPickerFieldSettings();
		if (builder.FieldType != "LocationPickerField")
		{
			yield break;
		}

		if (updateModel.TryUpdateModel(
		  model, "LocationPickerFieldSettings", null, null))
		{
			builder.WithSetting("LocationPickerFieldSettings.DisplayOptions",
								model.SaveOptions.ToString());
		}

		yield return DefinitionTemplate(model);
	}
}

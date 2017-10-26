using System.Collections.Generic;
using GoogleLocation.Settings;
using Orchard.ContentManagement;
using Orchard.ContentManagement.MetaData;
using Orchard.ContentManagement.MetaData.Builders;
using Orchard.ContentManagement.MetaData.Models;
using Orchard.ContentManagement.ViewModels;

public class GoogleLocationFieldEditorEvents : ContentDefinitionEditorEventsBase
{

	public override IEnumerable<TemplateViewModel>
	  PartFieldEditor(ContentPartFieldDefinition definition)
	{
		if (definition.FieldDefinition.Name == "GoogleLocationField")
		{
			var model = definition.Settings.GetModel<GoogleLocationFieldSettings>();
			yield return DefinitionTemplate(model);
		}
	}

	public override IEnumerable<TemplateViewModel> PartFieldEditorUpdate(
	  ContentPartFieldDefinitionBuilder builder, IUpdateModel updateModel)
	{
		var model = new GoogleLocationFieldSettings();
		if (builder.FieldType != "GoogleLocationField")
		{
			yield break;
		}

		if (updateModel.TryUpdateModel(
		  model, "GoogleLocationFieldSettings", null, null))
		{
			builder.WithSetting("GoogleLocationFieldSettings.DisplayOptions",
								model.DisplayOptions.ToString());
		}

		yield return DefinitionTemplate(model);
	}
}

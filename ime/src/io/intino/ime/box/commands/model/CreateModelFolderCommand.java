package io.intino.ime.box.commands.model;

import io.intino.ime.box.ImeBox;
import io.intino.ime.box.commands.Command;
import io.intino.ime.box.models.ModelContainer;
import io.intino.ime.model.Model;

public class CreateModelFolderCommand extends Command<ModelContainer.File> {
	public Model model;
	public String name;
	public ModelContainer.File parent;

	public CreateModelFolderCommand(ImeBox box) {
		super(box);
	}

	@Override
	public ModelContainer.File execute() {
		return box.modelManager().createFolder(model, name, parent);
	}

}
